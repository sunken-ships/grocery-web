"use client";

import Nav from "@/components/Nav";
import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Doc, Id } from "../../../../convex/_generated/dataModel";

interface RecipeWithDetails {
  _id: Id<"recipes">;
  name: string;
  ingredients: Array<{
    id: Id<"ingredients">;
    amount: number;
  }>;
  ingredientsWithDetails?: Array<Doc<"ingredients"> & { amount: number }>;
}

export default function RecipeListPage() {
  const recipes = useQuery(api.recipes.fetchRecipes);

  if (!recipes) {
    return (
      <div className="flex flex-col min-h-screen">
        <Nav />
        <div className="flex flex-col items-center justify-center flex-grow">
          <div className="text-lg">Loading recipes...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Nav />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Recipes</h1>
          <a
            href="/recipes/create"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
          >
            Create New Recipe
          </a>
        </div>

        {recipes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg mb-4">No recipes found</div>
            <a
              href="/recipes/create"
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
            >
              Create Your First Recipe
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe._id} recipe={recipe} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RecipeCard({ recipe }: { recipe: Doc<"recipes"> }) {
  const recipeWithIngredients = useQuery(api.recipes.getRecipeWithIngredients, {
    id: recipe._id,
  });

  const calculateRecipePrice = () => {
    if (!recipeWithIngredients?.ingredientsWithDetails) return 0;

    return recipeWithIngredients.ingredientsWithDetails.reduce(
      (total, ingredient) => {
        if (!ingredient.price || !ingredient.quantity) {
          return total;
        }
        const pricePerUnit = ingredient.price / ingredient.quantity;
        return total + pricePerUnit * ingredient.amount;
      },
      0
    );
  };

  const calculateIngredientPrice = (
    ingredient: Doc<"ingredients"> & { amount: number }
  ) => {
    if (!ingredient.price || !ingredient.quantity) {
      return 0;
    }
    const pricePerUnit = ingredient.price / ingredient.quantity;
    return pricePerUnit * ingredient.amount;
  };

  if (!recipeWithIngredients) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-semibold">{recipeWithIngredients.name}</h2>
        <div className="text-lg font-bold text-green-600">
          ${calculateRecipePrice().toFixed(2)}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-medium text-gray-700 mb-2">
          Ingredients (
          {recipeWithIngredients.ingredientsWithDetails?.length || 0})
        </h3>

        {recipeWithIngredients.ingredientsWithDetails?.map((ingredient) => (
          <div
            key={ingredient._id}
            className="flex justify-between items-center bg-gray-50 p-3 rounded"
          >
            <div className="flex-1">
              <div className="font-medium">{ingredient.name}</div>
              <div className="text-sm text-gray-500">
                {ingredient.amount} {ingredient.unit} • {ingredient.category}
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium">
                ${calculateIngredientPrice(ingredient).toFixed(2)}
              </div>
              <div className="text-sm text-gray-500">
                ${ingredient.price?.toFixed(2) || "N/A"}/{ingredient.quantity}
                {ingredient.unit}
              </div>
            </div>
          </div>
        ))}
      </div>

      {(!recipeWithIngredients.ingredientsWithDetails ||
        recipeWithIngredients.ingredientsWithDetails.length === 0) && (
        <div className="text-gray-500 text-center py-4">
          No ingredients found for this recipe
        </div>
      )}
    </div>
  );
}
