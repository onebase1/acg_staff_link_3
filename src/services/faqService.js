import { supabase } from "@/lib/supabase";

/**
 * Service for managing FAQ entries in the chatbot_faq table.
 * Supports multi-tenant isolation where agency_id is NULL for platform defaults.
 */
const faqService = {

    /**
     * Fetch all effective FAQs for an agency (their specific ones + platform defaults).
     * Note: The logic to choose specific override over default is usually handled in UI Preview 
     * or by Kylie (the n8n agent).
     */
    async getAgencyFAQs(agencyId) {
        const { data, error } = await supabase
            .from('chatbot_faq')
            .select('*')
            .or(`agency_id.eq.${agencyId},agency_id.is.null`)
            .eq('active', true)
            .order('priority', { ascending: false })
            .order('category');
        if (error) throw error;
        return data || [];
    },

    /**
     * Fetch ONLY this agency's custom FAQs.
     */
    async getCustomFAQs(agencyId) {
        if (!agencyId) return [];
        const { data, error } = await supabase
            .from('chatbot_faq')
            .select('*')
            .eq('agency_id', agencyId)
            .order('category')
            .order('priority', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    /**
     * Fetch platform defaults only (agency_id IS NULL).
     */
    async getPlatformDefaults() {
        const { data, error } = await supabase
            .from('chatbot_faq')
            .select('*')
            .is('agency_id', null)
            .order('category')
            .order('priority', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    /**
     * Create a new agency-specific FAQ.
     */
    async createFAQ(agencyId, faqData) {
        if (!agencyId) throw new Error("Agency ID is required to create a custom FAQ.");
        const { data, error } = await supabase
            .from('chatbot_faq')
            .insert({
                agency_id: agencyId,
                category: faqData.category,
                question: faqData.question.trim(),
                answer: faqData.answer.trim(),
                keywords: faqData.keywords || [],
                priority: faqData.priority ?? 0,
                active: faqData.active ?? true,
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    /**
     * Update an existing FAQ. Agency row ownership enforced.
     */
    async updateFAQ(faqId, agencyId, updates) {
        const { data, error } = await supabase
            .from('chatbot_faq')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq('id', faqId)
            .eq('agency_id', agencyId)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    /**
     * Delete an agency-specific FAQ.
     */
    async deleteFAQ(faqId, agencyId) {
        const { error } = await supabase
            .from('chatbot_faq')
            .delete()
            .eq('id', faqId)
            .eq('agency_id', agencyId);
        if (error) throw error;
        return true;
    },

    /**
     * Create an agency override by cloning a platform default.
     */
    async overridePlatformDefault(platformFAQId, agencyId, customAnswer) {
        // Fetch the original platform default
        const { data: original, error: fetchError } = await supabase
            .from('chatbot_faq')
            .select('*')
            .eq('id', platformFAQId)
            .is('agency_id', null)
            .single();
        if (fetchError) throw fetchError;

        // Create the override row
        return this.createFAQ(agencyId, {
            category: original.category,
            question: original.question,
            answer: customAnswer || original.answer,
            keywords: original.keywords,
            priority: (original.priority || 0) + 1, // Higher priority to take precedence
            active: true,
        });
    },

    /**
     * Bulk create FAQs for an agency
     * @param {string} agencyId 
     * @param {Array} faqsData 
     */
    async bulkCreateFAQs(agencyId, faqsData) {
        if (!agencyId) throw new Error('Agency ID is required');

        const formattedData = faqsData.map(faq => ({
            agency_id: agencyId,
            category: faq.category || 'general',
            question: faq.question,
            answer: faq.answer,
            keywords: Array.isArray(faq.keywords) ? faq.keywords : (faq.keywords ? faq.keywords.split(',').map(k => k.trim()) : []),
            priority: parseInt(faq.priority) || 0,
            active: faq.active !== undefined ? faq.active : true
        }));

        const { data, error } = await supabase
            .from('chatbot_faq')
            .insert(formattedData)
            .select();

        if (error) {
            console.error('Error in bulkCreateFAQs:', error);
            throw error;
        }
        return data;
    }
};

export default faqService;
