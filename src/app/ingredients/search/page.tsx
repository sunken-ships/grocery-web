"use client";
import React, { useEffect, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import IngredientCard from "@/components/IngredientCard";
import Nav from "@/components/Nav";
import { useSearchParams } from "next/navigation";
import { Doc } from "../../../../convex/_generated/dataModel";

export default function IngredientsSearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("query") || "";
  const [similarIngredients, setSimilarIngredients] = useState<
    Doc<"ingredients">[]
  >([]);

  const ingredients = useQuery(api.ingredients.fetchIngredients, {});
  const results = useQuery(api.ingredients.fuzzyIngredientSearch, {
    name: query,
  });

  const similarIngredientsAction = useAction(
    api.ingredients.similarIngredientsSearch
  );

  useEffect(() => {
    if (query) {
      similarIngredientsAction({ name: query }).then((results) => {
        setSimilarIngredients(results);
      });
    }
  }, [query]);

  return (
    <div>
      <Nav />
      <h1>Search Results - Fuzzy</h1>
      {results && (
        <div className="m-4 px-2 md:px-8 flex flex-wrap gap-4">
          {results.map((value, index) => {
            return <IngredientCard key={index} ingredient={value} />;
          })}
        </div>
      )}

      <h1>Similar Ingredients - Vector Similarity</h1>
      {similarIngredients && (
        <div className="m-4 px-2 md:px-8 flex flex-wrap gap-4">
          {similarIngredients.map((value, index) => {
            return <IngredientCard key={index} ingredient={value} />;
          })}
        </div>
      )}

      <h1>All Ingredients</h1>
      <div className="m-4 px-2 md:px-8 flex flex-wrap gap-4">
        {ingredients?.map((value, index) => {
          return <IngredientCard key={index} ingredient={value} />;
        })}
      </div>
    </div>
  );
}
