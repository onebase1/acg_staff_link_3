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
export async function loadTemplate(
  templateName: string,
  variables: Record<string, any>
): Promise<string> {
  try {
    // Read the template file
    const url = new URL(`./templates/${templateName}.html`, import.meta.url);
    const html = await Deno.readTextFile(url);
    
    // Replace all template variables {{variable_name}}
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, String(value ?? ''));
    }
    
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
