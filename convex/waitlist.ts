import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getWaitlistCount = query({
    args: {},
    returns: v.number(),
    handler: async (ctx) => {
        let count = 0;
        for await (const _ of ctx.db.query("waitlist")) {
            count += 1;
        }
        return count;
    },
});

export const joinWaitlist = mutation({
    args: { email: v.string() },
    returns: v.object({ id: v.id("waitlist"), email: v.string(), message: v.string() }),
    handler: async (ctx, args) => {
        const normalizedEmail = args.email.trim().toLowerCase();

        // Enforce unique emails by checking the indexed lookup first.
        const existing = await ctx.db
            .query("waitlist")
            .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
            .unique();
        if (existing) {
            return {
                id: existing._id,
                email: existing.email,
                message: "Someone is excited, dont worry you are already signed up",
            };
        }

        const id = await ctx.db.insert("waitlist", { email: normalizedEmail });
        return { id, email: normalizedEmail, message: "You're on the list! We'll be in touch soon." };
    },
});


