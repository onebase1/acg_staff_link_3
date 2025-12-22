import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Trophy, TrendingUp, Star, Clock, AlertCircle,
  Award, Flame, Target, Shield, Zap, ThumbsUp
} from 'lucide-react';
import { calculateImprovementTips } from '@/services/scoring/improvementCalculator';
import { createPageUrl } from '@/utils';

/**
 * 🏆 MY SCORE - Staff Reliability Dashboard
 *
 * Shows staff their current reliability score, breakdown,
 * earned badges, and personalized tips to improve.
 *
 * 🔒 Visibility controlled by agency setting: show_score_to_staff
 */

export default function MyScore() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [staffProfile, setStaffProfile] = useState(null);
  const [badges, setBadges] = useState([]);
  const [error, setError] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    checkAccessAndFetchData();
  }, []);

  const checkAccessAndFetchData = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate(createPageUrl('Login'));
        return;
      }

      // Get staff record to find agency_id
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('id, agency_id, first_name, last_name, reliability_score, score_breakdown, current_streak, longest_streak, urgent_shifts_covered, last_incident_date, created_date')
        .eq('user_id', user.id)
        .single();

      if (staffError) throw staffError;

      // Check if agency allows score visibility
      const { data: agency, error: agencyError } = await supabase
        .from('agencies')
        .select('show_score_to_staff')
        .eq('id', staff.agency_id)
        .single();

      if (!agency?.show_score_to_staff) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      setStaffProfile(staff);

      // Get earned badges
      const { data: badgeData, error: badgeError } = await supabase
        .from('staff_badges')
        .select('*')
        .eq('staff_id', staff.id)
        .order('earned_at', { ascending: false });

      if (!badgeError && badgeData) {
        setBadges(badgeData);
      }

    } catch (err) {
      console.error('Error fetching score data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get score color based on value
  const getScoreColor = (score) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBand = (score) => {
    if (score >= 90) return { label: 'Elite', color: 'bg-emerald-100 text-emerald-800', icon: Trophy };
    if (score >= 70) return { label: 'Reliable', color: 'bg-blue-100 text-blue-800', icon: Shield };
    if (score >= 50) return { label: 'Building', color: 'bg-blue-50 text-blue-700', icon: TrendingUp }; // 🆕 Changed from "Average" to "Building" - more positive for new staff
    return { label: 'At Risk', color: 'bg-red-100 text-red-800', icon: AlertCircle };
  };

  // Badge icon mapping
  const badgeIcons = {
    reliable: { icon: Shield, color: 'text-blue-600', bg: 'bg-blue-100' },
    on_fire: { icon: Flame, color: 'text-orange-600', bg: 'bg-orange-100' },
    redeemed: { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100' },
    client_favorite: { icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    urgency_hero: { icon: Zap, color: 'text-purple-600', bg: 'bg-purple-100' },
    rising_star: { icon: Award, color: 'text-pink-600', bg: 'bg-pink-100' },
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto p-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-4xl mx-auto m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Error loading score: {error}</AlertDescription>
      </Alert>
    );
  }

  // 🔒 Access denied - agency has disabled score visibility for staff
  if (accessDenied) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-8 text-center">
            <Shield className="w-16 h-16 text-amber-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Score Not Available</h2>
            <p className="text-gray-600 mb-4">
              Your agency has not enabled staff score visibility. Contact your administrator if you have questions.
            </p>
            <button
              onClick={() => navigate(createPageUrl('StaffPortal'))}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              Back to Staff Portal
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const score = staffProfile?.reliability_score || 50;
  const breakdown = staffProfile?.score_breakdown || { base: 50 };
  const scoreBand = getScoreBand(score);
  const BandIcon = scoreBand.icon;
  const tips = calculateImprovementTips(breakdown, staffProfile?.current_streak || 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4">
      {/* Header with Score */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-8 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Reliability Score</h1>
            <p className="text-indigo-100">
              Your performance rating across all shifts
            </p>
          </div>
          <div className="text-center">
            <div className="relative">
              <div className={`text-7xl font-bold ${score >= 70 ? 'text-white' : 'text-amber-300'}`}>
                {score}
              </div>
              <div className="text-sm text-indigo-200 mt-1">out of 100</div>
            </div>
            <Badge className={`${scoreBand.color} mt-2`}>
              <BandIcon className="w-3 h-3 mr-1" />
              {scoreBand.label}
            </Badge>
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            Score Breakdown
          </CardTitle>
          <CardDescription>How your score is calculated</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ScoreItem label="Starting Score" value={breakdown.base || 50} max={50} color="bg-indigo-400" suffix="✓" isBase />
          <ScoreItem label="Attendance" value={breakdown.attendance || 0} max={20} color="bg-green-500" suffix={`+${breakdown.attendance || 0}`} />
          <ScoreItem label="Client Ratings" value={breakdown.ratings || 0} max={20} color="bg-yellow-500" suffix={`+${breakdown.ratings || 0}`} />
          <ScoreItem label="Loyalty" value={breakdown.loyalty || 0} max={5} color="bg-blue-500" suffix={`+${breakdown.loyalty || 0}`} />
          {breakdown.streak_bonus > 0 && (
            <ScoreItem label="Streak Bonus" value={breakdown.streak_bonus} max={25} color="bg-orange-500" suffix={`+${breakdown.streak_bonus}`} />
          )}
          {breakdown.urgency_bonus > 0 && (
            <ScoreItem label="Urgency Hero Bonus" value={breakdown.urgency_bonus} max={25} color="bg-purple-500" suffix={`+${breakdown.urgency_bonus}`} />
          )}
          {breakdown.penalties < 0 && (
            <ScoreItem label="Penalties" value={Math.abs(breakdown.penalties)} max={30} color="bg-red-500" suffix={`${breakdown.penalties}`} isNegative />
          )}
        </CardContent>
      </Card>

      {/* Streak & Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Flame} label="Current Streak" value={staffProfile?.current_streak || 0} suffix="shifts" color="text-orange-600" />
        <StatCard icon={Trophy} label="Longest Streak" value={staffProfile?.longest_streak || 0} suffix="shifts" color="text-amber-600" />
        <StatCard icon={Zap} label="Urgent Shifts" value={staffProfile?.urgent_shifts_covered || 0} suffix="covered" color="text-purple-600" />
        <StatCard icon={Clock} label="Member Since" value={staffProfile?.created_date ? new Date(staffProfile.created_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'N/A'} color="text-blue-600" />
      </div>

      {/* Badges Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-600" />
            Earned Badges
          </CardTitle>
          <CardDescription>Recognition for your achievements</CardDescription>
        </CardHeader>
        <CardContent>
          {badges.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {badges.map((badge) => {
                const badgeConfig = badgeIcons[badge.badge_type] || { icon: Award, color: 'text-gray-600', bg: 'bg-gray-100' };
                const BadgeIcon = badgeConfig.icon;
                return (
                  <div key={badge.id} className={`${badgeConfig.bg} rounded-lg p-4 text-center`}>
                    <BadgeIcon className={`w-8 h-8 mx-auto mb-2 ${badgeConfig.color}`} />
                    <p className="font-semibold text-gray-900">{badge.badge_name}</p>
                    <p className="text-xs text-gray-500">{new Date(badge.earned_at).toLocaleDateString()}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No badges earned yet</p>
              <p className="text-sm">Complete shifts and improve your score to earn badges!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* How to Improve */}
      {tips.length > 0 && (
        <Card className="border-2 border-indigo-200 bg-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              How to Improve Your Score
            </CardTitle>
            <CardDescription>Personalized tips based on your performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tips.map((tip, index) => (
                <div key={index} className="flex items-center gap-3 bg-white rounded-lg p-3">
                  <span className="text-2xl">{tip.icon}</span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{tip.action}</p>
                    <p className="text-sm text-green-600">+{tip.points} points potential</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper Components
function ScoreItem({ label, value, max, color, suffix, isNegative, isBase }) {
  const percentage = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">
          {label}
          {isBase && <span className="text-xs text-indigo-500 ml-2">(Everyone starts here)</span>}
        </span>
        <span className={isNegative ? 'text-red-600 font-medium' : isBase ? 'text-indigo-600 font-medium' : 'text-green-600 font-medium'}>{suffix}</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, suffix, color }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <Icon className={`w-6 h-6 mx-auto mb-2 ${color}`} />
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {suffix && <p className="text-xs text-gray-500">{suffix}</p>}
        <p className="text-sm text-gray-600 mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

