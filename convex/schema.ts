import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    waitlist: defineTable({
        email: v.string(),
    }).index("by_email", ["email"]),

    ingredients: defineTable({
        name: v.string(),
        unit: v.optional(v.union(
            v.literal('g'),
            v.literal('ml'),
            v.literal('whole')
        )),
        quantity: v.optional(v.number()),
        price: v.optional(v.number()),
        category: v.optional(v.string()),
        isPriceEstimated: v.boolean(),
        nameEmbedding: v.optional(v.array(v.float64()))
    }).vectorIndex("by_name_embedding", {
        vectorField: "nameEmbedding",
        dimensions: 1536,
        filterFields: ["isPriceEstimated", "category"]
    }).searchIndex("search_name", {
        searchField: "name",
    }).index(
        "by_embedding", ["nameEmbedding"]
    ).index(
        "by_category", ["category"]
    ).index(
        "by_price", ["price"]
    ),

    recipes: defineTable({
        name: v.string(),
        ingredients: v.array(v.object({
            id: v.id("ingredients"),
            amount: v.number()
        })),

    })
});


