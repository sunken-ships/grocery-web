import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
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

        return ingredientId;
    }
})

// Internal


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

export const estimatePrices = internalAction({
    handler: async (ctx) => {
        const ingredientsWithoutPrice = await ctx.runQuery(internal.ingredients.getIngredientsWithoutPrice)

        if (ingredientsWithoutPrice.length === 0) {
            console.log("No ingredients to estimate prices");
            return;
        }

        const filteredIngredients = ingredientsWithoutPrice.filter((ingredient) => ingredient.category != null && ingredient.category != "other")

        if (filteredIngredients.length === 0) {
            console.log("No ingredients with category to estimate prices");
            return;
        }

        console.log(`Estimating prices for ${filteredIngredients.length} ingredients`);

        for (const ingredient of filteredIngredients) {
            // Create a list of other ingredients to use for price estimation
            const otherIngredients = []
            const similarIngredients = await ctx.runAction(api.ingredients.similarIngredientsSearch, {
                name: ingredient.name
            })
            otherIngredients.push(...similarIngredients)

            const categoryIngredients = await ctx.runQuery(api.ingredients.fetchIngredients, { category: ingredient.category })
            otherIngredients.push(...categoryIngredients)
            // TODO: add checks for these ingredients, each of these ingredients should have a price and quantity and unit.

            console.log(`Other ingredients: ${otherIngredients.length}`);

            const priceEstimation = await generatePriceIngredients(ingredient, categoryIngredients)

            if (priceEstimation == null) {
                console.error(`Failed to estimate price for ingredient ${ingredient.name}`);
                continue;
            }

            await ctx.runMutation(internal.ingredients.setPrice, {
                id: ingredient._id,
                price: priceEstimation.price,
                quantity: priceEstimation.quantity,
                unit: priceEstimation.unit
            })
        }
    }
})

export const embedIngredients = internalAction({
    handler: async (ctx) => {
        const ingredients = await ctx.runQuery(internal.ingredients.getIngredientsWithoutEmbedding)

        if (ingredients.length === 0) {
            console.log("No ingredients to embed");
            return
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

        const response = await categorizeIngredients(ingredients, args.categories);

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

export const setPrice = internalMutation({
    args: {
        id: v.id("ingredients"),
        price: v.number(),
        quantity: v.number(),
        unit: v.union(
            v.literal('g'),
            v.literal('ml'),
            v.literal('whole')
        )
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            price: args.price,
            quantity: args.quantity,
            unit: args.unit
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
        return await ctx.db.query("ingredients").withIndex("by_embedding", (q) => q.eq("nameEmbedding", undefined)).take(20);
    }
})

export const getIngredientsWithoutPrice = internalQuery({
    handler: async (ctx) => {
        return await ctx.db.query("ingredients").withIndex("by_price", (q) => q.eq("price", undefined)).take(20);
    }
})


// Helper Functions

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

type AIPriceEstimationResponse = {
    id: string;
    price: number;
    quantity: number;
    unit: 'g' | 'ml' | 'whole';
} | null

const priceEstimationSchema = z.object({
    id: z.string(),
    price: z.number(),
    quantity: z.number(),
    unit: z.union([
        z.literal('g'),
        z.literal('ml'),
        z.literal('whole')
    ])
})

const priceEstimationSchemaArray = z.object({
    ingredients: z.array(priceEstimationSchema)
})

const categorizationSchema = z.object({
    id: z.string(),
    category: z.string(),
    confidence: z.number()
})

const categorizationSchemaArray = z.object({
    ingredients: z.array(categorizationSchema)
})


async function categorizeIngredients(ingredients: Array<Doc<"ingredients">>, categories: string[]): Promise<AICategorizationResponse> {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    })

    const categoriesJson = JSON.stringify(categories)

    const systemPrompt = `
    Role and Objective:
    Categorize provided ingredient names into one of the predefined categories and estimate the confidence level of the categorization.
    Instructions:
    - Use only these categories: ${categoriesJson}.
    - For each input ingredient, determine and return the most appropriate category and a confidence score between 0.0 (least confident) and 1.0 (most confident).
    - If an ingredient is ambiguous or a compound product, select the category based on the main component and adjust the confidence score to reflect any uncertainty.
    - If the ingredient cannot be identified, assign 'other' as the category and use a low confidence score.
    - Return the categorization for each ingredient.
    `

    const ingredientsJson = JSON.stringify(ingredients.map((ingredient) => ({
        id: ingredient._id,
        name: ingredient.name
    })))

    const userPrompt = `
    The ingredients to categorieze are: 
    ${ingredientsJson}.
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

    return result
}


async function generatePriceIngredients(ingredient: Doc<"ingredients">, similarIngredients: Array<Doc<"ingredients">>): Promise<AIPriceEstimationResponse> {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    })

    const systemPrompt = `
    Role and Objective:
    You are a price estimator for ingredients.
    You will be given a ingredient and other ingredients that are in the same category.
    You will need to estimate the price of the ingredients based on the similar ingredients.
    You will need to return the price, quantity, and unit of the ingredients.
    You will need to return the id of the ingredients.

    Notes:
    - For the unit only use g, ml, or whole.
    - For the quantity try to keep it 100 for g and ml and 1 for whole.
    - These ingredient prices are for the Ontario region of Canada.
    `


    const json = JSON.stringify(similarIngredients.map((ingredient) => ({
        name: ingredient.name,
        price: ingredient.price,
        quantity: ingredient.quantity,
        unit: ingredient.unit
    })))

    const userPrompt = `
    The ingredient to estimate the price for is:
    IngredientId:${ingredient._id}, Name:${ingredient.name}.
    The similar ingredients are:
    ${json}
    `

    const response = await openai.responses.parse({
        model: "gpt-5-mini",
        input: [{ role: "developer", content: systemPrompt }, { role: "user", content: userPrompt }],
        text: {
            format: zodTextFormat(priceEstimationSchema, "priceEstimation")
        }
    })

    const result = response.output_parsed

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