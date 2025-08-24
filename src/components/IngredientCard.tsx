import { Doc } from "../../convex/_generated/dataModel";

export default function IngredientCard({
  ingredient,
}: {
  ingredient: Doc<"ingredients">;
}) {
  return (
    <div className="flex flex-col bg-white/20 rounded-lg p-4 h-min">
      <div className="uppercase font-bold">{ingredient.name}</div>
      <p className="text-sm text-gray-500">Category: {ingredient.category}</p>
      <p className="text-sm text-gray-500">
        Price: {ingredient.price} / {ingredient.quantity} {ingredient.unit}
      </p>
    </div>
  );
}
