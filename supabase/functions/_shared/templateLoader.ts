/**
 * Template Loader Utility
 * Loads HTML email templates from the _shared/templates directory
 * and replaces template variables with actual data
 */

/**
 * Load and populate a template with data
 * @param templateName - Name of the template file (without .html extension)
 * @param variables - Object with key-value pairs to replace in the template
 * @returns Populated HTML string
 */
import Handlebars from "https://esm.sh/handlebars@4.7.7?no-check";
import { daily_agency_digest } from "./templates/daily_agency_digest.ts";
import { weekly_agency_summary } from "./templates/weekly_agency_summary.ts";

const TEMPLATES: Record<string, string> = {
  daily_agency_digest,
  weekly_agency_summary
};

/**
 * Load and populate a template with data
 * @param templateName - Name of the template (from TEMPLATES map)
 * @param variables - Object with key-value pairs to replace in the template
 * @returns Populated HTML string
 */
export async function loadTemplate(
  templateName: string,
  variables: Record<string, any>
): Promise<string> {
  try {
    // Get the template string from our embedded map
    const source = TEMPLATES[templateName];
    
    if (!source) {
      throw new Error(`Template "${templateName}" not found in embedded TEMPLATES map.`);
    }
    
    // Compile and execute Handlebars template
    const template = Handlebars.compile(source);
    const html = template(variables);
    
    return html;
  } catch (error) {
    console.error(`Error loading template ${templateName}:`, error);
    throw error;
  }
}

/**
 * Helper function to format date ranges for email headers
 */
export function formatDateRange(startDate: Date, endDate: Date): string {
  const options: Intl.DateTimeFormatOptions = { 
    day: 'numeric', 
    month: 'short' 
  };
  
  const start = startDate.toLocaleDateString('en-GB', options);
  const end = endDate.toLocaleDateString('en-GB', options);
  
  return `${start} - ${end}`;
}

/**
 * Helper function to group shifts by week
 */
export function groupShiftsByWeek(shifts: any[]): Map<string, any[]> {
  const weeks = new Map<string, any[]>();
  
  for (const shift of shifts) {
    const shiftDate = new Date(shift.date);
    
    // Get Monday of the week
    const monday = new Date(shiftDate);
    monday.setDate(shiftDate.getDate() - (shiftDate.getDay() === 0 ? 6 : shiftDate.getDay() - 1));
    
    // Get Sunday of the week
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const weekKey = formatDateRange(monday, sunday);
    
    if (!weeks.has(weekKey)) {
      weeks.set(weekKey, []);
    }
    
    weeks.get(weekKey)!.push(shift);
  }
  
  return weeks;
}
