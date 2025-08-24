import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

export const createRecipe = mutation({
    args: {
        name: v.string(),
        ingredients: v.array(v.object({
            id: v.id("ingredients"),
            amount: v.number()
        }))
    },
    handler: async (ctx, args) => {
        // Validate that all ingredients exist
        for (const ingredient of args.ingredients) {
            const ingredientDoc = await ctx.db.get(ingredient.id);
            if (!ingredientDoc) {
                throw new Error(`Ingredient with id ${ingredient.id} not found`);
            }
        }

        const recipeId = await ctx.db.insert("recipes", {
            name: args.name,
            ingredients: args.ingredients
        });

        return recipeId;
    }
});

export const fetchRecipes = query({
    handler: async (ctx) => {
        return await ctx.db.query("recipes").collect();
    }
});

export const getRecipeById = query({
    args: {
        id: v.id("recipes")
    },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    }
});

export const getRecipeWithIngredients = query({
    args: {
        id: v.id("recipes")
    },
    handler: async (ctx, args) => {
        const recipe = await ctx.db.get(args.id);
        if (!recipe) {
            return null;
        }

        const ingredientsWithDetails = [];
        for (const recipeIngredient of recipe.ingredients) {
            const ingredient = await ctx.db.get(recipeIngredient.id);
            if (ingredient) {
                ingredientsWithDetails.push({
                    ...ingredient,
                    amount: recipeIngredient.amount
                });
            }
        }

        return {
            ...recipe,
            ingredientsWithDetails
        };
    }
});
