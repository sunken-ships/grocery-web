import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";


// Public
export const fetchIngredients = query({
    args: {
        category: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        return await ctx.db.query("ingredients").withIndex("by_category", (q) => q.eq("category", args.category)).collect();
    }
})

export const exactIngredientSearch = query({
    args: {
        name: v.string(),
    },
    handler: async (ctx, args) => {

        // search for exact matches
        const searchResults = await ctx.db
            .query("ingredients")
            .withIndex("by_name", (q) => q.eq("name", args.name))
            .first();

        return searchResults;
    }
})

export const similarIngredientsSearch = action({
    args: {
        name: v.string()
    },
    handler: async (ctx, args) => {
        // Get the embedding for the ingredient name
        const embeding = await embed(args.name)

        // search for similar ingredients
        const results = await ctx.vectorSearch("ingredients", "by_name_embedding", {
            vector: embeding,
            limit: 10
        })

        // fetch the ingredients
        const ingredients: Array<Doc<"ingredients">> = await ctx.runQuery(internal.ingredients.getMultipleByIds, {
            ids: results.map((result) => result._id)
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
            name: args.name
        })

        return ingredientId;
    }
})

// Internal

// Updates Ingredient with embedding and price estimation
export const updateIngredient = internalAction({
    args: {
        id: v.id("ingredients"),
        name: v.string()
    },
    handler: async (ctx, args) => {
        const embedding = await embed(args.name);
        // create embedding
        await ctx.runMutation(internal.ingredients.setEmbedding, {
            id: args.id,
            embedding
        })

        // update category
        ctx.scheduler.runAfter(0, internal.ingredients.categorize, {
            ingredientId: args.id,
            categories: []
        })

        // Get the similar ingredients
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

export const categorize = internalAction({
    args: {
        ingredientId: v.id("ingredients"),
        categories: v.array(v.string())
    },
    handler: async (ctx, args) => {

        // get the ingredient
        const ingredient: Doc<"ingredients"> | null = await ctx.runQuery(internal.ingredients.getById, {
            id: args.ingredientId
        });
        if (ingredient == null) {
            throw new Error("Ingredient not found");
        }

        // update the ingredient
        const response = await categorizeIngredients(ingredient.name, args.categories);

        // update the ingredient
        await ctx.runMutation(internal.ingredients.setCategory, {
            id: args.ingredientId,
            category: {
                name: response.category,
                confidence: response.confidence
            }
        })
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

export const getById = internalQuery({
    args: {
        id: v.id("ingredients")
    },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
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



function estimatePrice(name: string, similarIngredients: Doc<"ingredients">[]) {
    // TODO: Implement price estimation
    return 0;
}

function embed(name: string) {
    // TODO: Implement embedding
    return [1]
}

type AICategorizationResponse = {
    category: string;
    confidence: number;
}

async function categorizeIngredients(name: string, categories: string[]): Promise<AICategorizationResponse> {
    // TODO: Implement categorization
    return {
        category: "unknown",
        confidence: 0
    }
}