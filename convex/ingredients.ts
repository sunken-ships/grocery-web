import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";


// Public
export const fetchIngredients = query({
    args: {
        category: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        if (args.category == null) {
            return await ctx.db.query("ingredients").collect();
        }
        return await ctx.db.query("ingredients").withIndex("by_category", (q) => q.eq("category", args.category)).collect();
    }
})

export const fuzzyIngredientSearch = query({
    args: {
        name: v.string(),
    },
    handler: async (ctx, args) => {

        // search for exact matches
        const searchResults = await ctx.db
            .query("ingredients")
            .withSearchIndex("search_name", (q) => q.search("name", args.name))
            .collect();

        return searchResults;
    }
})

export const similarIngredientsSearch = action({
    args: {
        name: v.string()
    },
    handler: async (ctx, args) => {
        console.log("Similar Ingredients Search", args.name);
        // Get the embedding for the ingredient name
        const embeding = await embed(args.name)

        // search for similar ingredients
        const results = await ctx.vectorSearch("ingredients", "by_name_embedding", {
            vector: embeding,
            limit: 10
        })

        if (results.length === 0) {
            console.log("No similar ingredients found");
            return [];
        }

        console.log("Similar ingredients found", results.length);

        // Filter out low confidence results
        const filteredResults = results.filter((result) => result._score > 0.45)

        // fetch the ingredients
        const ingredients: Array<Doc<"ingredients">> = await ctx.runQuery(internal.ingredients.getMultipleByIds, {
            ids: filteredResults.map((result) => result._id)
        })

        return ingredients
    }
})

export const createIngredient = mutation({
    args: {
        name: v.string(),
        unit: v.optional(v.union(
            v.literal('g'),
            v.literal('ml'),
            v.literal('whole')
        )),
        quantity: v.optional(v.number()),
        price: v.optional(v.number()),
        category: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const ingredientId = await ctx.db.insert("ingredients", {
            name: args.name,
            unit: args.unit,
            quantity: args.quantity,
            price: args.price,
            isPriceEstimated: args.price == null ? true : false,
            category: args.category
        })
        ctx.scheduler.runAfter(0, internal.ingredients.updateIngredient, {
            id: ingredientId,
            name: args.name,
            generateCategory: args.category == null ? true : false,
            generatePrice: false
        })

        return ingredientId;
    }
})

// Internal

// Updates Ingredient with embedding and price estimation
export const updateIngredient = internalAction({
    args: {
        id: v.id("ingredients"),
        name: v.string(),
        generateCategory: v.optional(v.boolean()),
        generatePrice: v.optional(v.boolean())
    },
    handler: async (ctx, args) => {
        const embedding = await embed(args.name);
        // create embedding
        await ctx.runMutation(internal.ingredients.setEmbedding, {
            id: args.id,
            embedding
        })

        if (args.generatePrice) {
            // update price
            // search for similar ingredients
            const results = await ctx.vectorSearch("ingredients", "by_name_embedding", {
                vector: embedding,
                limit: 10
            })

            // fetch the ingredients
            const similarIngredients: Array<Doc<"ingredients">> = await ctx.runQuery(internal.ingredients.getMultipleByIds, {
                ids: results.map((result) => result._id)
            })

            // Estimate the price
            const price = await estimatePrice(args.name, similarIngredients);

            // Set the price
            await ctx.runMutation(internal.ingredients.setPrice, {
                id: args.id,
                price: price
            })
        }


    }
})

export const setEmbedding = internalMutation({
    args: {
        id: v.id("ingredients"),
        embedding: v.array(v.float64())
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            nameEmbedding: args.embedding
        })
    }
})

export const setPrice = internalMutation({
    args: {
        id: v.id("ingredients"),
        price: v.number()
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            price: args.price,
            isPriceEstimated: true
        })
    }
})


export const getMultipleByIds = internalQuery({
    args: {
        ids: v.array(v.id("ingredients"))
    },
    handler: async (ctx, args) => {
        const results = [];
        for (const id of args.ids) {
            const doc = await ctx.db.get(id);
            if (doc == null) {
                continue;
            }
            results.push(doc)
        }
        return results;
    }
})


// Automated

export const embedIngredients = internalAction({
    handler: async (ctx) => {
        const ingredients = await ctx.runQuery(internal.ingredients.getIngredientsWithoutEmbedding)

        if (ingredients.length === 0) {
            console.log("No ingredients to embed");
        }

        console.log(`Embedding ${ingredients.length} ingredients`);
        for (const ingredient of ingredients) {
            const embedding = await embed(ingredient.name);
            await ctx.runMutation(internal.ingredients.setEmbedding, {
                id: ingredient._id,
                embedding: embedding
            })
        }
    }
})

export const categorize = internalAction({
    args: {
        categories: v.array(v.string())
    },
    handler: async (ctx, args) => {

        // get the ingredient that has no category
        const ingredients = await ctx.runQuery(internal.ingredients.getIngredientsWithoutCategory)

        if (ingredients.length === 0) {
            console.log("No ingredients to categorize");
            return;
        }

        console.log(`Categorizing ${ingredients.length} ingredients`);
        const ingredientsToUpdate = ingredients.map((ingredient) => `IngredientId:${ingredient._id} , Name:${ingredient.name}`).join("\n");
        console.log('Ingredients to update: \n', ingredientsToUpdate);

        const response = await categorizeIngredients(ingredientsToUpdate, args.categories);
        console.log('Response: \n', response);

        if (response == null) {
            console.error('Failed to categorize ingredients');
            return;
        }

        for (const ingredient of response.ingredients) {
            await ctx.runMutation(internal.ingredients.setCategory, {
                id: ingredient.id as Id<"ingredients">,
                category: {
                    name: ingredient.category,
                    confidence: ingredient.confidence
                }
            })
        }


    }
})

export const setCategory = internalMutation({
    args: {
        id: v.id("ingredients"),
        category: v.object({
            name: v.string(),
            confidence: v.number()
        })
    },
    handler: async (ctx, args) => {
        if (args.category.confidence < 0.5) {
            throw new Error("Category confidence is too low");
        }
        await ctx.db.patch(args.id, {
            category: args.category.name,
        })
    }
})

export const getIngredientsWithoutCategory = internalQuery({
    handler: async (ctx) => {
        return await ctx.db.query("ingredients").withIndex("by_category", (q) => q.eq("category", undefined)).take(20);
    }
})

export const getIngredientsWithoutEmbedding = internalQuery({
    handler: async (ctx) => {
        return await ctx.db.query("ingredients").filter((q) => q.eq(q.field("nameEmbedding"), undefined)).take(20);
    }
})


// Helper Functions

function estimatePrice(name: string, similarIngredients: Doc<"ingredients">[]) {
    // TODO: Implement price estimation
    return 0;
}

async function embed(name: string) {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    })

    const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: name,
        dimensions: 1536,
        encoding_format: "float"
    })

    return response.data[0].embedding;
}

type AICategorizationResponse = {
    ingredients: {
        id: string;
        category: string;
        confidence: number;
    }[]
} | null


const categorizationSchema = z.object({
    id: z.string(),
    category: z.string(),
    confidence: z.number()
})

const categorizationSchemaArray = z.object({
    ingredients: z.array(categorizationSchema)
})


async function categorizeIngredients(ingredients: string, categories: string[]): Promise<AICategorizationResponse> {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    })

    const systemPrompt = `
    Role and Objective:
    Categorize provided ingredient names into one of the predefined categories and estimate the confidence level of the categorization.
    Instructions:
    - Use only these categories. \n
        ${categories.map((category) => `- ${category}`).join("\n")}
    - For each input ingredient, determine and return the most appropriate category and a confidence score between 0.0 (least confident) and 1.0 (most confident).
    - If an ingredient is ambiguous or a compound product, select the category based on the main component and adjust the confidence score to reflect any uncertainty.
    - If the ingredient cannot be identified, assign 'other' as the category and use a low confidence score.
    - Return the categorization for each ingredient.
    `
    const userPrompt = `
    The ingredients to categorieze are: 
    ${ingredients}.
    Return the categorization for each ingredient.
    `
    const response = await openai.responses.parse({
        model: "gpt-5-nano",
        input: [{ role: "developer", content: systemPrompt }, { role: "user", content: userPrompt }],
        text: {
            format: zodTextFormat(categorizationSchemaArray, "categorization")
        }
    })

    const result = response.output_parsed

    // TODO: Implement categorization
    return result
}

// TESTING

export const deleteAllCategories = internalMutation({
    handler: async (ctx) => {
        const ingredients = await ctx.db.query("ingredients").collect();
        for (const ingredient of ingredients) {
            await ctx.db.patch(ingredient._id, {
                category: undefined
            })
        }
    }
})