import React, { useState, useEffect } from 'react';
import {
    Bot,
    Search,
    Plus,
    Edit2,
    Trash2,
    Copy,
    Lock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    MessageSquare,
    ChevronRight,
    Filter,
    Eye,
    Settings,
    FileUp,
    Download,
    Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import faqService from '@/services/faqService';
import { supabase } from '@/lib/supabase';

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const CATEGORIES = [
    { value: 'uniforms', label: 'Uniforms', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    { value: 'rates', label: 'Rates', color: 'bg-green-100 text-green-700 border-green-200' },
    { value: 'timesheets', label: 'Timesheets', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    { value: 'shifts', label: 'Shifts', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { value: 'availability', label: 'Availability', color: 'bg-teal-100 text-teal-700 border-teal-200' },
    { value: 'general', label: 'General', color: 'bg-gray-100 text-gray-700 border-gray-200' },
    { value: 'compliance', label: 'Compliance', color: 'bg-red-100 text-red-700 border-red-200' },
    { value: 'payment', label: 'Payment', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { value: 'policies', label: 'Policies', color: 'bg-slate-100 text-slate-700 border-slate-200' },
];

export default function KylieFAQManager() {
    const { user } = useAuth();
    const agencyId = user?.agency_id;

    const [platformDefaults, setPlatformDefaults] = useState([]);
    const [customFAQs, setCustomFAQs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFAQ, setEditingFAQ] = useState(null);
    const [formData, setFormData] = useState({
        category: 'general',
        question: '',
        answer: '',
        keywords: '',
        priority: 0,
        active: true
    });

    const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
    const [overrideData, setOverrideData] = useState({
        id: null,
        question: '',
        answer: ''
    });

    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
    const [importLoading, setImportLoading] = useState(false);

    useEffect(() => {
        if (agencyId) {
            loadData();
        }
    }, [agencyId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [defaults, customs] = await Promise.all([
                faqService.getPlatformDefaults(),
                faqService.getCustomFAQs(agencyId)
            ]);
            setPlatformDefaults(defaults);
            setCustomFAQs(customs);
        } catch (error) {
            console.error('Error loading FAQs:', error);
            toast.error('Failed to load FAQ data');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setEditingFAQ(null);
        setFormData({
            category: 'general',
            question: '',
            answer: '',
            keywords: '',
            priority: 0,
            active: true
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (faq) => {
        setEditingFAQ(faq);
        setFormData({
            category: faq.category,
            question: faq.question,
            answer: faq.answer,
            keywords: (faq.keywords || []).join(', '),
            priority: faq.priority,
            active: faq.active
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.question || !formData.answer) {
            toast.error('Question and Answer are required');
            return;
        }

        try {
            const payload = {
                ...formData,
                keywords: formData.keywords.split(',').map(k => k.trim()).filter(Boolean)
            };

            if (editingFAQ) {
                await faqService.updateFAQ(editingFAQ.id, agencyId, payload);
                toast.success('FAQ updated successfully');
            } else {
                await faqService.createFAQ(agencyId, payload);
                toast.success('New FAQ created');
            }

            setIsModalOpen(false);
            loadData();
        } catch (error) {
            console.error('Error saving FAQ:', error);
            toast.error('Failed to save FAQ');
        }
    };

    const handleDelete = async (faqId) => {
        if (!window.confirm('Are you sure you want to delete this FAQ override?')) return;

        try {
            await faqService.deleteFAQ(faqId, agencyId);
            toast.success('FAQ deleted');
            loadData();
        } catch (error) {
            console.error('Error deleting FAQ:', error);
            toast.error('Failed to delete FAQ');
        }
    };

    const handleOpenOverride = (faq) => {
        setOverrideData({
            id: faq.id,
            question: faq.question,
            answer: faq.answer
        });
        setIsOverrideModalOpen(true);
    };

    const handleSaveOverride = async () => {
        try {
            await faqService.overridePlatformDefault(overrideData.id, agencyId, overrideData.answer);
            toast.success('Agency override created');
            setIsOverrideModalOpen(false);
            loadData();
        } catch (error) {
            console.error('Error creating override:', error);
            toast.error('Failed to create override');
        }
    };

    const downloadTemplate = () => {
        const headers = ['category', 'question', 'answer', 'keywords', 'priority', 'active'];
        const example = ['uniforms', 'What is the uniform policy?', 'Our policy requires all staff to wear agency-provided scrubs during shifts.', 'scrubs, uniform, clothing', '5', 'true'];
        const csvContent = [headers.join(','), example.map(v => `"${v}"`).join(',')].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'Kylie_FAQ_Template.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Template downloaded. Share this with your LLM!');
    };

    const handleBulkImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setImportLoading(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target.result;
                const lines = text.split(/\r?\n/);
                if (lines.length < 2) throw new Error('File is empty or missing data');

                const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
                const faqs = [];

                // Simple CSV parser for quoted strings
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;

                    // Regex to split by comma but ignore commas inside quotes
                    const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
                    const FAQ = {};
                    headers.forEach((header, idx) => {
                        let val = values[idx] || '';
                        val = val.replace(/^"|"$/g, '').trim();
                        FAQ[header] = val;
                    });

                    if (FAQ.question && FAQ.answer) {
                        faqs.push(FAQ);
                    }
                }

                if (faqs.length === 0) throw new Error('No valid FAQs found in file');

                await faqService.bulkCreateFAQs(agencyId, faqs);
                toast.success(`Successfully imported ${faqs.length} FAQs`);
                setIsBulkImportOpen(false);
                loadData();
            } catch (error) {
                console.error('Bulk import error:', error);
                toast.error(error.message || 'Failed to parse or import FAQs');
            } finally {
                setImportLoading(false);
                e.target.value = ''; // Reset input
            }
        };
        reader.readAsText(file);
    };

    const getCategoryBadge = (category) => {
        const cat = CATEGORIES.find(c => c.value === category) || CATEGORIES[5];
        return (
            <Badge variant="outline" className={`${cat.color} font-medium border`}>
                {cat.label}
            </Badge>
        );
    };

    const filterFAQs = (faqs) => {
        if (!searchQuery) return faqs;
        const lowerQuery = searchQuery.toLowerCase();
        return faqs.filter(f =>
            f.question.toLowerCase().includes(lowerQuery) ||
            f.answer.toLowerCase().includes(lowerQuery) ||
            (f.keywords && f.keywords.some(k => k.toLowerCase().includes(lowerQuery))) ||
            f.category.toLowerCase().includes(lowerQuery)
        );
    };

    // Logic for unified preview: Overrides take precedence over defaults
    const getUnifiedFAQs = () => {
        const unified = [...customFAQs];
        const overrideQuestions = new Set(customFAQs.map(f => f.question.toLowerCase().trim()));

        platformDefaults.forEach(def => {
            if (!overrideQuestions.has(def.question.toLowerCase().trim())) {
                unified.push({ ...def, isDefault: true });
            }
        });

        return unified.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    };

    if (loading && !agencyId) return <div className="p-8 text-center text-gray-500">Loading Agency Context...</div>;

    return (
        <div className="p-1 md:p-8 max-w-7xl mx-auto space-y-6">
            {/* Header section with glassmorphism feel */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/40 backdrop-blur-md p-6 rounded-2xl border border-white/20 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-200">
                        <Bot className="text-white w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Kylie FAQ Manager</h1>
                        <p className="text-gray-500 text-sm">Control what Kylie knows about your agency policies.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-cyan-600 transition-colors" />
                        <Input
                            placeholder="Search FAQs..."
                            className="pl-10 w-full md:w-64 bg-white/80 border-gray-200 focus:ring-2 focus:ring-cyan-500/20"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" onClick={() => setIsBulkImportOpen(true)} className="rounded-xl border-gray-300">
                        <FileUp className="w-4 h-4 mr-2" /> Bulk Import
                    </Button>
                    <Button onClick={handleOpenCreate} className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl shadow-md">
                        <Plus className="w-4 h-4 mr-2" /> New FAQ
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="agency" className="space-y-6">
                <TabsList className="bg-gray-100/50 p-1 rounded-xl glass-morphism border border-white/20">
                    <TabsTrigger value="agency" className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">Agency FAQs</TabsTrigger>
                    <TabsTrigger value="platform" className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">Platform Defaults</TabsTrigger>
                    <TabsTrigger value="preview" className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">Kylie Preview</TabsTrigger>
                </TabsList>

                {/* Agency FAQs Tab */}
                <TabsContent value="agency" className="space-y-4">
                    {filterFAQs(customFAQs).length === 0 ? (
                        <Card className="border-dashed border-gray-200 bg-gray-50/50">
                            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                    <MessageSquare className="text-gray-400 w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">No custom FAQs yet</h3>
                                <p className="text-gray-500 max-w-xs mb-6">Create agency-specific questions or override platform defaults to tailor Kylie's knowledge.</p>
                                <Button variant="outline" onClick={handleOpenCreate} className="rounded-xl border-gray-300">
                                    <Plus className="w-4 h-4 mr-2" /> Add first FAQ
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {filterFAQs(customFAQs).map((faq) => (
                                <FAQCard
                                    key={faq.id}
                                    faq={faq}
                                    onEdit={() => handleOpenEdit(faq)}
                                    onDelete={() => handleDelete(faq.id)}
                                    getCategoryBadge={getCategoryBadge}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Platform Defaults Tab */}
                <TabsContent value="platform" className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                        {filterFAQs(platformDefaults).map((faq) => (
                            <Card key={faq.id} className="group hover:border-cyan-200 transition-all bg-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Lock className="w-12 h-12 rotate-12" />
                                </div>
                                <CardHeader className="pb-3 flex-row items-start justify-between space-y-0">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            {getCategoryBadge(faq.category)}
                                            <Badge variant="secondary" className="bg-gray-100 text-gray-600 font-normal">
                                                Platform Default
                                            </Badge>
                                        </div>
                                        <CardTitle className="text-lg font-semibold leading-tight text-gray-900">{faq.question}</CardTitle>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleOpenOverride(faq)}
                                        className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg shrink-0"
                                    >
                                        <Copy className="w-4 h-4 mr-2" /> Override
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-gray-600 text-sm line-clamp-3 leading-relaxed mb-4">
                                        {faq.answer}
                                    </p>
                                    <div className="flex items-center gap-4 text-xs text-gray-400">
                                        <span className="flex items-center gap-1">
                                            <Settings className="w-3 h-3" /> Priority: {faq.priority}
                                        </span>
                                        {faq.keywords && faq.keywords.length > 0 && (
                                            <span className="flex items-center gap-1">
                                                <Search className="w-3 h-3" /> {faq.keywords.join(', ')}
                                            </span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* Kylie Preview Tab */}
                <TabsContent value="preview" className="space-y-4">
                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start gap-3 mb-6">
                        <Eye className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-800 leading-relaxed">
                            This preview shows the <strong>effective set of knowledge</strong> Kylie currently uses.
                            Agency overrides automatically hide platform defaults with the same question.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        {filterFAQs(getUnifiedFAQs()).map((faq) => (
                            <Card key={faq.id} className={`transition-all bg-white border-l-4 ${faq.isDefault ? 'border-l-gray-300' : 'border-l-cyan-500'}`}>
                                <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                                    <div className="flex items-center gap-2">
                                        {getCategoryBadge(faq.category)}
                                        {faq.isDefault ? (
                                            <Badge variant="secondary" className="bg-gray-50 text-gray-500 text-[10px] uppercase tracking-wider font-bold h-5">DEFAULT</Badge>
                                        ) : (
                                            <Badge variant="secondary" className="bg-cyan-50 text-cyan-600 text-[10px] uppercase tracking-wider font-bold h-5 flex items-center gap-1">
                                                <Sparkles className="w-2.5 h-2.5" /> CUSTOM
                                            </Badge>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-gray-400 font-mono">PRIORITY: {faq.priority}</span>
                                </CardHeader>
                                <CardContent>
                                    <h3 className="font-bold text-gray-900 mb-2">{faq.question}</h3>
                                    <p className="text-gray-600 text-sm leading-relaxed italic border-l-2 border-gray-100 pl-3">
                                        "{faq.answer}"
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Create/Edit Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-xl rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
                    <div className="bg-cyan-600 p-6 text-white">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                {editingFAQ ? <Edit2 className="w-5 h-5" /> : <Plus className="w-6 h-6" />}
                                {editingFAQ ? 'Edit FAQ Entry' : 'Create New FAQ Entry'}
                            </DialogTitle>
                            <DialogDescription className="text-cyan-100 opacity-90">
                                Customise Kylie's response to a specific question.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="p-6 space-y-5 bg-white">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="category" className="text-gray-700 font-medium">Category</Label>
                                <Select
                                    value={formData.category}
                                    onValueChange={(val) => setFormData({ ...formData, category: val })}
                                >
                                    <SelectTrigger className="rounded-xl border-gray-200">
                                        <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {CATEGORIES.map(cat => (
                                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="priority" className="text-gray-700 font-medium">Priority (0-10)</Label>
                                <Input
                                    id="priority"
                                    type="number"
                                    min="0" max="10"
                                    className="rounded-xl border-gray-200"
                                    value={formData.priority}
                                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="question" className="text-gray-700 font-medium">Question</Label>
                            <Input
                                id="question"
                                placeholder="What is the policy for uniforms?"
                                className="rounded-xl border-gray-200"
                                value={formData.question}
                                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="answer" className="text-gray-700 font-medium">Answer</Label>
                            <Textarea
                                id="answer"
                                placeholder="Your detailed response here..."
                                rows={4}
                                className="rounded-xl border-gray-200 resize-none focus:ring-cyan-500"
                                value={formData.answer}
                                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="keywords" className="text-gray-700 font-medium">Keywords</Label>
                            <Input
                                id="keywords"
                                placeholder="uniform, dress code, clothing, scrubs (comma separated)"
                                className="rounded-xl border-gray-200"
                                value={formData.keywords}
                                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                            />
                            <p className="text-[10px] text-gray-400 pl-1 italic">Kylie uses these to detect intent in WhatsApp messages.</p>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                            <div className="space-y-0.5">
                                <Label className="text-gray-800 font-medium">Active Status</Label>
                                <p className="text-[11px] text-gray-500 leading-none">Should Kylie use this entry right now?</p>
                            </div>
                            <Switch
                                checked={formData.active}
                                onCheckedChange={(val) => setFormData({ ...formData, active: val })}
                                className="data-[state=checked]:bg-cyan-600"
                            />
                        </div>
                    </div>

                    <DialogFooter className="p-6 bg-gray-50/50 border-t border-gray-100 flex flex-row items-center justify-end gap-3">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl border-gray-300">Cancel</Button>
                        <Button onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl shadow-lg shadow-cyan-100 px-8">
                            {editingFAQ ? 'Update Changes' : 'Create FAQ'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Override Modal */}
            <Dialog open={isOverrideModalOpen} onOpenChange={setIsOverrideModalOpen}>
                <DialogContent className="max-w-lg rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
                    <div className="bg-amber-500 p-6 text-white">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                <Copy className="w-5 h-5" /> Override Platform Default
                            </DialogTitle>
                            <DialogDescription className="text-amber-50 opacity-90">
                                Tailor a platform-wide response to fit your agency's specific workflow.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="p-6 space-y-6 bg-white">
                        <div className="space-y-1">
                            <Label className="text-xs text-gray-400 uppercase font-bold tracking-wider">Default Question</Label>
                            <p className="text-gray-900 font-semibold p-3 bg-gray-50 rounded-xl border border-gray-100">{overrideData.question}</p>
                        </div>

                        <div className="space-y-3">
                            <Label htmlFor="overrideAnswer" className="text-gray-700 font-medium">Custom Agency Answer</Label>
                            <Textarea
                                id="overrideAnswer"
                                rows={5}
                                className="rounded-xl border-gray-200 resize-none focus:ring-amber-500"
                                value={overrideData.answer}
                                onChange={(e) => setOverrideData({ ...overrideData, answer: e.target.value })}
                            />
                            <div className="bg-amber-50 p-3 rounded-xl flex items-start gap-2 border border-amber-100">
                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-amber-800">
                                    This will create a new custom FAQ for your agency. Kylie will prioritise this answer over the platform default.
                                </p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-6 bg-gray-50/50 border-t border-gray-100">
                        <Button variant="outline" onClick={() => setIsOverrideModalOpen(false)} className="rounded-xl border-gray-300">Cancel</Button>
                        <Button onClick={handleSaveOverride} className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-lg shadow-amber-100">
                            Save Agency Override
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Import Modal */}
            <Dialog open={isBulkImportOpen} onOpenChange={setIsBulkImportOpen}>
                <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
                    <div className="bg-slate-800 p-6 text-white text-center">
                        <DialogHeader>
                            <div className="flex justify-center mb-4">
                                <FileUp className="w-12 h-12 text-cyan-400" />
                            </div>
                            <DialogTitle className="text-xl font-bold">Bulk FAQ Import</DialogTitle>
                            <DialogDescription className="text-slate-300 mt-2">
                                Import multiple FAQs at once using a CSV file. Perfect for data prepared by LLMs.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="p-8 space-y-6 bg-white">
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
                            <Download className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                            <div className="space-y-2">
                                <p className="text-sm font-semibold text-blue-900">Step 1: Download Template</p>
                                <p className="text-xs text-blue-800">Use our standard CSV format. You can paste this into ChatGPT/Claude to help generate your FAQs.</p>
                                <Button size="sm" variant="outline" onClick={downloadTemplate} className="bg-white hover:bg-blue-100 text-blue-700 border-blue-200 rounded-lg text-xs h-8">
                                    <Download className="w-3 h-3 mr-2" /> Download CSV Template
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <p className="text-sm font-semibold text-gray-900 text-center">Step 2: Upload Files</p>
                            <div className="relative border-2 border-dashed border-gray-200 hover:border-cyan-400 rounded-2xl p-8 transition-colors group cursor-pointer">
                                <Input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleBulkImport}
                                    disabled={importLoading}
                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                />
                                <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center group-hover:bg-cyan-50 transition-colors">
                                        <Plus className="w-6 h-6 text-gray-400 group-hover:text-cyan-600" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-600">
                                        {importLoading ? 'Processing...' : 'Click or drag CSV here'}
                                    </p>
                                    <p className="text-[10px] text-gray-400">CSV files only (Max 5MB)</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-4 bg-gray-50 border-t border-gray-100">
                        <Button variant="ghost" onClick={() => setIsBulkImportOpen(false)} className="w-full text-gray-500 rounded-xl hover:bg-gray-100">
                            Dismiss
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function FAQCard({ faq, onEdit, onDelete, getCategoryBadge }) {
    return (
        <Card className="group hover:border-cyan-200 transition-all bg-white relative overflow-hidden shadow-sm hover:shadow-md">
            <CardHeader className="pb-3 flex-row items-start justify-between space-y-0 gap-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        {getCategoryBadge(faq.category)}
                        {!faq.active && <Badge variant="destructive" className="bg-red-50 text-red-600 border-red-100 font-medium">Inactive</Badge>}
                        <Badge variant="secondary" className="bg-cyan-50 text-cyan-600 font-medium">Agency Custom</Badge>
                    </div>
                    <CardTitle className="text-lg font-bold leading-tight text-gray-900">{faq.question}</CardTitle>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={onEdit} className="text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-xl h-9 w-9">
                        <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onDelete} className="text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl h-9 w-9">
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                    {faq.answer}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1 py-1 px-2 bg-gray-50 rounded-md">
                        <Settings className="w-3 h-3" /> Priority: <span className="font-bold text-gray-600">{faq.priority}</span>
                    </span>
                    {faq.keywords && faq.keywords.length > 0 && (
                        <div className="flex items-center gap-1 py-1 px-2 bg-gray-50 rounded-md">
                            <Search className="w-3 h-3" />
                            <div className="flex gap-1">
                                {faq.keywords.slice(0, 3).map((k, i) => (
                                    <span key={i} className="text-gray-600">{k}{i < 2 && i < faq.keywords.length - 1 ? ',' : ''}</span>
                                ))}
                                {faq.keywords.length > 3 && <span>+{faq.keywords.length - 3} more</span>}
                            </div>
                        </div>
                    )}
                    <span className="ml-auto text-gray-300 font-mono flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> VIEWS: {faq.view_count || 0}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}

