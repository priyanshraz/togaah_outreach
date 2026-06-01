'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Sparkles, Copy } from 'lucide-react';
import { useBackgroundTasks } from '@/components/background-tasks/background-task-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Header } from '@/components/dashboard/header';

const campaignSchema = z.object({
  campaign_name: z.string().min(3, 'Campaign name must be at least 3 characters'),
  service_type: z.string().min(1, 'Service type is required'),
  target_region: z.string().min(1, 'Target region is required'),
  campaign_goal: z.string().min(1, 'Campaign goal is required'),
  campaign_message: z.string().min(10, 'Campaign message must be at least 10 characters'),
  cta_button_text: z.string().min(1, 'CTA button text is required'),
  cta_link: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  tone: z.string().min(1, 'Tone is required'),
  selected_sheet: z.string().min(1, 'Lead sheet is required'),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

export default function NewCampaignPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { startTask } = useBackgroundTasks();
  const [isReuse, setIsReuse] = useState(false);
  const reusedRef = useRef(false);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch('/api/leads/counts')
      .then((r) => r.json())
      .then((d) => setCounts(d.counts ?? {}))
      .catch(() => {});
  }, []);

  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      cta_button_text: 'Book Free Consultation',
      cta_link: 'https://www.toga.com/en/contact',
    },
  });

  // Pre-fill form if coming from "Reuse" action
  useEffect(() => {
    if (reusedRef.current) return;
    const stored = sessionStorage.getItem('reuse_campaign');
    if (!stored) return;
    try {
      const data = JSON.parse(stored);
      sessionStorage.removeItem('reuse_campaign');
      reusedRef.current = true;
      setIsReuse(true);
      // Reset form with old values
      form.reset({
        campaign_name: data.campaign_name ? data.campaign_name.replace(/(\s*\(Copy\))+$/i, '') : '',
        service_type: data.service_type ?? '',
        target_region: data.target_region ?? '',
        campaign_goal: data.campaign_goal ?? '',
        campaign_message: data.campaign_message ?? '',
        cta_button_text: data.cta_button_text ?? 'Book Free Consultation',
        cta_link: data.cta_link ?? 'https://www.toga.com/en/contact',
        tone: data.tone ?? '',
        selected_sheet: data.selected_sheet ?? '',
      });
    } catch {
      sessionStorage.removeItem('reuse_campaign');
    }
  }, [form]);

  const onSubmit = async (data: CampaignFormData) => {
    // Navigate away immediately — task runs in background
    router.push('/dashboard/campaigns');

    startTask('CAMPAIGN', {
      name: data.campaign_name,
      estimatedSeconds: 120,
      run: async () => {
        const response = await fetch('/api/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to create campaign');
        return { message: '✅ Email generated! Review and approve it to send.' };
      },
    });

    toast({
      title: '⚡ Generating email in background',
      description: 'You can browse freely — we\'ll notify you when done.',
    });
  };

  return (
    <>
      <div className="min-h-full">
        <Header
          title={isReuse ? 'Reuse Email' : 'New Email Message'}
          description={isReuse ? 'Pre-filled from previous campaign — edit and create new' : 'AI generates the email content — you review and approve before sending'}
        />

        <div className="p-6 pb-28 max-w-2xl mx-auto">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => router.back()} className="text-gray-600">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Email Messages
            </Button>
          </div>

          {/* Reuse banner */}
        {isReuse && (
          <div className="flex items-center gap-3 rounded-lg border border-[#0077b6]/30 bg-[#0077b6]/5 px-4 py-3 text-sm text-[#0077b6]">
            <Copy className="h-4 w-4 flex-shrink-0" />
            <p>
              <span className="font-semibold">Reusing previous campaign.</span>{' '}
              All fields pre-filled — edit anything before creating.
            </p>
          </div>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* Email Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Email Details</CardTitle>
                <CardDescription>Basic information about this campaign</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Name</label>
                  <Input
                    {...form.register('campaign_name')}
                    placeholder="e.g. April Hair Transplant Awareness"
                    
                  />
                  {form.formState.errors.campaign_name && (
                    <p className="text-red-500 text-xs mt-1">{form.formState.errors.campaign_name.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                    <Select onValueChange={(v) => form.setValue('service_type', v)} >
                      <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Hair_Transplant">Hair Transplant</SelectItem>
                        <SelectItem value="Dental_Treatment">Dental Treatment</SelectItem>
                        <SelectItem value="Cosmetic_Surgery">Cosmetic Surgery</SelectItem>
                        <SelectItem value="Eye_Treatment">Eye Treatment</SelectItem>
                        <SelectItem value="IVF_Fertility">IVF Fertility</SelectItem>
                        <SelectItem value="Thermal_Wellness">Thermal Wellness</SelectItem>
                        <SelectItem value="All_Services">All Services</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.service_type && (
                      <p className="text-red-500 text-xs mt-1">{form.formState.errors.service_type.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Region</label>
                    <Select onValueChange={(v) => form.setValue('target_region', v)} >
                      <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Europe">Europe</SelectItem>
                        <SelectItem value="Middle East">Middle East</SelectItem>
                        <SelectItem value="Asia">Asia</SelectItem>
                        <SelectItem value="North America">North America</SelectItem>
                        <SelectItem value="Global">Global</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.target_region && (
                      <p className="text-red-500 text-xs mt-1">{form.formState.errors.target_region.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lead Sheet</label>
                  <Select onValueChange={(v) => form.setValue('selected_sheet', v)} >
                    <SelectTrigger><SelectValue placeholder="Select Table tab" /></SelectTrigger>
                    <SelectContent>
                      {['table1','table2','table3','table4','table5','table6'].map((t) => (
                        <SelectItem key={t} value={t}>
                          <span className="font-medium">{t}</span>
                          {counts[t] !== undefined && (
                            <span className="ml-2 text-gray-400 text-xs">— {counts[t].toLocaleString()} leads</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.selected_sheet && (
                    <p className="text-red-500 text-xs mt-1">{form.formState.errors.selected_sheet.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Email Content */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Email Content</CardTitle>
                <CardDescription>AI will craft the full email from your brief</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Goal</label>
                  <Select onValueChange={(v) => form.setValue('campaign_goal', v)} >
                    <SelectTrigger><SelectValue placeholder="What's the goal?" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Book consultation">Book consultation</SelectItem>
                      <SelectItem value="Share educational content">Share educational content</SelectItem>
                      <SelectItem value="Announce new service">Announce new service</SelectItem>
                      <SelectItem value="Patient testimonial spotlight">Patient testimonial spotlight</SelectItem>
                      <SelectItem value="Seasonal awareness campaign">Seasonal awareness campaign</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.campaign_goal && (
                    <p className="text-red-500 text-xs mt-1">{form.formState.errors.campaign_goal.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Message</label>
                  <Textarea
                    {...form.register('campaign_message')}
                    placeholder="Describe what you want to communicate. The AI will write the full email from this brief..."
                    rows={5}
                    
                  />
                  {form.formState.errors.campaign_message && (
                    <p className="text-red-500 text-xs mt-1">{form.formState.errors.campaign_message.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Tone</label>
                  <Select onValueChange={(v) => form.setValue('tone', v)} >
                    <SelectTrigger><SelectValue placeholder="Select tone" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Warm and educational">Warm and educational</SelectItem>
                      <SelectItem value="Professional and authoritative">Professional and authoritative</SelectItem>
                      <SelectItem value="Friendly and conversational">Friendly and conversational</SelectItem>
                      <SelectItem value="Urgent and action-oriented">Urgent and action-oriented</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.tone && (
                    <p className="text-red-500 text-xs mt-1">{form.formState.errors.tone.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* CTA */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Call to Action</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Button Text</label>
                  <Input
                    {...form.register('cta_button_text')}
                    placeholder="Book Free Consultation"
                    
                  />
                  {form.formState.errors.cta_button_text && (
                    <p className="text-red-500 text-xs mt-1">{form.formState.errors.cta_button_text.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Button Link (optional)</label>
                  <Input
                    {...form.register('cta_link')}
                    placeholder="https://www.toga.com/en/contact"
                    
                  />
                  {form.formState.errors.cta_link && (
                    <p className="text-red-500 text-xs mt-1">{form.formState.errors.cta_link.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Button
              type="submit"
              className="w-full bg-[#0077b6] hover:bg-[#005f8f] text-white"
              size="lg"
              
            >
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating AI Content...</>
              ) : (
                <><Sparkles className="mr-2 h-5 w-5" /> Create Campaign &amp; Generate Content</>
              )}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
