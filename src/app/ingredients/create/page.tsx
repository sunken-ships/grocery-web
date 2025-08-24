"use client";
import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Nav from "../../../components/Nav";
import IngredientCard from "@/components/IngredientCard";

function IngredientInsert() {
  const createIngredientMutation = useMutation(
    api.ingredients.createIngredient
  );
  const formRef = React.useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const ingredientName = formData.get("ingredientName") as string;

    try {
      const result = await createIngredientMutation({
        name: ingredientName,
      });
      console.log("Created ingredient:", result);
      // Reset form using ref
      formRef.current?.reset();
    } catch (error) {
      console.error("Error creating ingredient:", error);
    }
  };

  return (
    <form
      ref={formRef}
      className="flex flex-col bg-white/20 rounded-lg p-4 w-min mx-auto"
      onSubmit={handleSubmit}
    >
      <label htmlFor="ingredientName">Name</label>
      <input
        type="text"
        id="ingredientName"
        name="ingredientName"
        required
        className="bg-white/20 text-black rounded-lg p-2"
      />

      <button
        type="submit"
        className="bg-blue-500 text-white p-2 rounded-md hover:cursor-pointer mt-2"
      >
        Create Ingredient
      </button>
    </form>
  );
}

export default function IngredientsCreatePage() {
  const ingredients = useQuery(api.ingredients.fetchIngredients, {});
  console.log(ingredients);
  return (
    <div className="flex flex-col min-h-screen ">
      <Nav />
      {/* TODO: check if the ingredient already exists, so once we put an ingredient in the insert field and they click submit before the ingredient is created (mutation is called) we should show existing ingredient */}
      <IngredientInsert />
      <div className="m-4 px-2 md:px-8 flex flex-wrap gap-4">
        {ingredients?.map((value, index) => {
          return <IngredientCard key={index} ingredient={value} />;
        })}
      </div>
    </div>
  );
}
