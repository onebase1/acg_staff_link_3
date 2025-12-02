import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Star, Send, CheckCircle, AlertCircle, User,
    Calendar, Clock, MapPin, Briefcase
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import RatingStars from '@/components/RatingStars';

/**
 * ShiftRating Component
 * Allows clients to rate staff performance after shift completion
 * 
 * Features:
 * - 4 rating dimensions (professionalism, competence, communication, reliability)
 * - Overall rating auto-calculated
 * - Optional comments
 * - Anonymous rating option
 * - Integration with Module 3 scoring system
 */
export default function ShiftRating({ shift, staff, onClose, onSuccess }) {
    const queryClient = useQueryClient();
    const [ratings, setRatings] = useState({
        professionalism_rating: 0,
        competence_rating: 0,
        communication_rating: 0,
        reliability_rating: 0,
    });
    const [comments, setComments] = useState('');
    const [anonymized, setAnonymized] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Calculate overall rating
    const overallRating = Object.values(ratings).reduce((sum, val) => sum + val, 0) / 4;

    const submitRatingMutation = useMutation({
        mutationFn: async () => {
            // Validate all ratings are provided
            const hasAllRatings = Object.values(ratings).every(r => r > 0);
            if (!hasAllRatings) {
                throw new Error('Please provide all 4 ratings');
            }

            // Get current user's client_contact
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                throw new Error('Not authenticated');
            }

            const { data: contactData, error: contactError } = await supabase
                .from('client_contacts')
                .select('id, client_id')
                .eq('profile_id', user.id)
                .eq('is_active', true)
                .single();

            if (contactError || !contactData) {
                throw new Error('Client contact not found');
            }

            // Insert rating
            const { error } = await supabase
                .from('client_ratings')
                .insert({
                    client_id: contactData.client_id,
                    staff_id: shift.assigned_staff_id,
                    shift_id: shift.id,
                    contact_id: contactData.id,
                    professionalism_rating: ratings.professionalism_rating,
                    competence_rating: ratings.competence_rating,
                    communication_rating: ratings.communication_rating,
                    reliability_rating: ratings.reliability_rating,
                    comments: comments.trim() || null,
                    anonymized: anonymized,
                });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['client-shifts']);
            queryClient.invalidateQueries(['client-ratings']);
            setSubmitted(true);
            toast.success('✅ Rating submitted! Thank you for your feedback.');

            if (onSuccess) {
                setTimeout(() => onSuccess(), 1500);
            }
        },
        onError: (error) => {
            toast.error(`Failed to submit rating: ${error.message}`);
        },
    });

    const handleRatingChange = (dimension, value) => {
        setRatings(prev => ({ ...prev, [dimension]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        submitRatingMutation.mutate();
    };

    // Success state
    if (submitted) {
        return (
            <Card className="max-w-2xl mx-auto">
                <CardContent className="p-8 text-center">
                    <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Rating Submitted!
                    </h2>
                    <p className="text-gray-600 mb-4">
                        Your feedback helps us maintain high standards and improve our service.
                    </p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                            <span className="text-3xl font-bold text-gray-900">
                                {overallRating.toFixed(1)}
                            </span>
                            <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                        </div>
                        <p className="text-sm text-gray-600">Overall Rating</p>
                    </div>
                    {onClose && (
                        <Button onClick={onClose} className="mt-6">
                            Close
                        </Button>
                    )}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <CardTitle className="flex items-center gap-2">
                    <Star className="w-6 h-6" />
                    Rate Staff Performance
                </CardTitle>
                <p className="text-blue-100 text-sm mt-1">
                    Help us improve by rating {staff?.first_name}'s performance
                </p>
            </CardHeader>

            <CardContent className="p-6">
                {/* Shift Details */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">
                                {staff?.first_name} {staff?.last_name}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-gray-500" />
                            <span>{shift?.role_required?.replace(/_/g, ' ') || 'Staff'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span>{shift?.date ? format(new Date(shift.date), 'MMM dd, yyyy') : 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span>{shift?.start_time} - {shift?.end_time}</span>
                        </div>
                    </div>
                </div>

                {/* Rating Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Rating Dimensions */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-900 mb-3">
                            Rate the following aspects (1-5 stars):
                        </h3>

                        {/* Professionalism */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                                <Label className="font-medium text-gray-900">Professionalism</Label>
                                <p className="text-xs text-gray-600">Appearance, conduct, and courtesy</p>
                            </div>
                            <RatingStars
                                value={ratings.professionalism_rating}
                                onChange={(value) => handleRatingChange('professionalism_rating', value)}
                                size="lg"
                            />
                        </div>

                        {/* Competence */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                                <Label className="font-medium text-gray-900">Competence</Label>
                                <p className="text-xs text-gray-600">Skills, knowledge, and ability</p>
                            </div>
                            <RatingStars
                                value={ratings.competence_rating}
                                onChange={(value) => handleRatingChange('competence_rating', value)}
                                size="lg"
                            />
                        </div>

                        {/* Communication */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                                <Label className="font-medium text-gray-900">Communication</Label>
                                <p className="text-xs text-gray-600">Clarity, responsiveness, and listening</p>
                            </div>
                            <RatingStars
                                value={ratings.communication_rating}
                                onChange={(value) => handleRatingChange('communication_rating', value)}
                                size="lg"
                            />
                        </div>

                        {/* Reliability */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                                <Label className="font-medium text-gray-900">Reliability</Label>
                                <p className="text-xs text-gray-600">Punctuality, dependability, and consistency</p>
                            </div>
                            <RatingStars
                                value={ratings.reliability_rating}
                                onChange={(value) => handleRatingChange('reliability_rating', value)}
                                size="lg"
                            />
                        </div>
                    </div>

                    {/* Overall Preview */}
                    {overallRating > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-900">Overall Rating:</span>
                                <div className="flex items-center gap-2">
                                    <RatingStars value={Math.round(overallRating)} readOnly size="lg" />
                                    <span className="text-2xl font-bold text-gray-900">
                                        {overallRating.toFixed(1)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Comments */}
                    <div className="space-y-2">
                        <Label htmlFor="comments">Additional Comments (Optional)</Label>
                        <Textarea
                            id="comments"
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            placeholder="Share any specific feedback or suggestions..."
                            rows={4}
                            className="resize-none"
                        />
                    </div>

                    {/* Anonymize Option */}
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="anonymized"
                            checked={anonymized}
                            onCheckedChange={setAnonymized}
                        />
                        <Label htmlFor="anonymized" className="text-sm cursor-pointer">
                            Submit rating anonymously (staff will not see your name)
                        </Label>
                    </div>

                    {/* Low Rating Warning */}
                    {overallRating > 0 && overallRating < 3 && (
                        <Alert variant="warning">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                <strong>Low rating detected.</strong> Our team will review this feedback and may reach out to discuss your concerns.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <Button
                            type="submit"
                            disabled={overallRating === 0 || submitRatingMutation.isPending}
                            className="flex-1"
                        >
                            {submitRatingMutation.isPending ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4 mr-2" />
                                    Submit Rating
                                </>
                            )}
                        </Button>
                        {onClose && (
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                        )}
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
