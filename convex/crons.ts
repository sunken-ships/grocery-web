import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs()

crons.interval(
    "category ingredients",
    { seconds: 20 },
    internal.ingredients.categorize,
    {
        categories: [
            "Meat & Seafood",
            "Dairy & Eggs",
            "Produce",
            "Frozen Foods",
            "Pantry",
            "Condiments, Sauces & Oils",
            "Canned Goods",
            "Plant-Based Proteins",
            "Beverages",
            "Snacks",
            "Baby"
        ]
    }
)

crons.interval(
    "embed ingredients",
    { seconds: 20 },
    internal.ingredients.embedIngredients
)

export default crons;