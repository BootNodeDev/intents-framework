export const rulesIndexTemplate = () => `
import { type RulesMap } from "../../types.js";

/**
 * Custom rules for the solver.
 * Add your rules here and export them in the rules object.
 * 
 * Example:
 * 
 * const myRule = async (args, context) => {
 *   // Rule implementation
 *   return { success: true };
 * };
 */

export const rules: RulesMap = {};
`;