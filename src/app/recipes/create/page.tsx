"use client";

import Nav from "@/components/Nav";
import React, { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Doc, Id } from "../../../../convex/_generated/dataModel";

interface RecipeIngredient {
  id: Id<"ingredients">;
  ingredient: Doc<"ingredients">;
  amount: number;
}

export default function RecipesPage() {
  const [recipeName, setRecipeName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIngredients, setSelectedIngredients] = useState<
    RecipeIngredient[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createRecipe = useMutation(api.recipes.createRecipe);
  const searchIngredients = useQuery(api.ingredients.fuzzyIngredientSearch, {
    name: searchTerm,
  });

  const handleAddIngredient = (ingredient: Doc<"ingredients">) => {
    // Check if ingredient is already added
    if (selectedIngredients.some((item) => item.id === ingredient._id)) {
      return;
    }

    setSelectedIngredients((prev) => [
      ...prev,
      {
        id: ingredient._id,
        ingredient,
        amount: 1,
      },
    ]);
    setSearchTerm("");
  };

  const handleRemoveIngredient = (ingredientId: Id<"ingredients">) => {
    setSelectedIngredients((prev) =>
      prev.filter((item) => item.id !== ingredientId)
    );
  };

  const handleAmountChange = (
    ingredientId: Id<"ingredients">,
    amount: number
  ) => {
    setSelectedIngredients((prev) =>
      prev.map((item) =>
        item.id === ingredientId ? { ...item, amount } : item
      )
    );
  };

  const calculateTotalPrice = () => {
    return selectedIngredients.reduce((total, item) => {
      if (!item.ingredient.price || !item.ingredient.quantity) {
        return total;
      }
      const pricePerUnit = item.ingredient.price / item.ingredient.quantity;
      return total + pricePerUnit * item.amount;
    }, 0);
  };

  const handleSubmitRecipe = async () => {
    if (!recipeName.trim() || selectedIngredients.length === 0) {
      alert("Please provide a recipe name and at least one ingredient");
      return;
    }

    setIsSubmitting(true);
    try {
      await createRecipe({
        name: recipeName,
        ingredients: selectedIngredients.map((item) => ({
          id: item.id,
          amount: item.amount,
        })),
      });

      // Reset form
      setRecipeName("");
      setSelectedIngredients([]);
      alert("Recipe created successfully!");
    } catch (error) {
      console.error("Error creating recipe:", error);
      alert("Failed to create recipe");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Nav />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Create New Recipe</h1>

        {/* Recipe Name Input */}
        <div className="mb-8">
          <label
            htmlFor="recipeName"
            className="block text-sm font-medium mb-2"
          >
            Recipe Name
          </label>
          <input
            id="recipeName"
            type="text"
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter recipe name..."
          />
        </div>

        {/* Ingredient Search */}
        <div className="mb-8">
          <label
            htmlFor="ingredientSearch"
            className="block text-sm font-medium mb-2"
          >
            Search Ingredients
          </label>
          <input
            id="ingredientSearch"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Search for ingredients..."
          />

          {/* Search Results */}
          {searchTerm && searchIngredients && searchIngredients.length > 0 && (
            <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {searchIngredients.map((ingredient) => (
                <div
                  key={ingredient._id}
                  onClick={() => handleAddIngredient(ingredient)}
                  className="px-4 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium">{ingredient.name}</div>
                  <div className="text-sm text-gray-500">
                    {ingredient.category} • ${ingredient.price}/
                    {ingredient.quantity}
                    {ingredient.unit}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Ingredients */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            Recipe Ingredients ({selectedIngredients.length})
          </h2>
          {selectedIngredients.length === 0 ? (
            <p className="text-gray-500">
              No ingredients added yet. Search and click to add ingredients.
            </p>
          ) : (
            <div className="space-y-3">
              {selectedIngredients.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between bg-gray-50 p-4 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">{item.ingredient.name}</div>
                    <div className="text-sm text-gray-500">
                      {item.ingredient.category}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="number"
                      value={item.amount}
                      onChange={(e) =>
                        handleAmountChange(
                          item.id,
                          parseFloat(e.target.value) || 0
                        )
                      }
                      min="0"
                      step="0.1"
                      className="w-20 px-2 py-1 border border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-500">
                      {item.ingredient.unit}
                    </span>
                    <button
                      onClick={() => handleRemoveIngredient(item.id)}
                      className="text-red-500 hover:text-red-700 font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-between items-center">
          <div className="text-lg font-semibold">
            Total Price: ${calculateTotalPrice().toFixed(2)}
          </div>
          <button
            onClick={handleSubmitRecipe}
            disabled={
              isSubmitting ||
              !recipeName.trim() ||
              selectedIngredients.length === 0
            }
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
          >
            {isSubmitting ? "Creating Recipe..." : "Create Recipe"}
          </button>
        </div>
      </div>
    </div>
  );
}
