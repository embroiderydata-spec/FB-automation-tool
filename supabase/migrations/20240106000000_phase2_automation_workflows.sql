-- Supabase Schema Migration: Phase 2.5 End-to-End AI Content Automation Workflow
-- Introduces automation_workflows, workflow_templates, and workflow_logs

-- ==============================================================================
-- 1. Create automation_workflows table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.automation_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workflow_name TEXT NOT NULL,
  configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'queued',
    'running',
    'paused',
    'waiting_for_approval',
    'completed',
    'failed',
    'cancelled'
  )),
  current_stage TEXT NOT NULL DEFAULT 'IDEA' CHECK (current_stage IN (
    'IDEA',
    'CONTENT_RESEARCH',
    'HOOK_GENERATION',
    'SCRIPT_GENERATION',
    'SCRIPT_APPROVAL',
    'STORYBOARD_GENERATION',
    'SCENE_GENERATION',
    'VOICEOVER_GENERATION',
    'SUBTITLE_GENERATION',
    'VIDEO_COMPOSITION',
    'QUALITY_CONTROL',
    'FINAL_VIDEO_APPROVAL',
    'PAGE_SELECTION',
    'CAPTION_GENERATION',
    'SCHEDULING',
    'PUBLISHING_QUEUE'
  )),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  approval_mode TEXT NOT NULL DEFAULT 'final_video_approval' CHECK (approval_mode IN (
    'fully_manual',
    'script_approval',
    'final_video_approval',
    'fully_automated'
  )),
  content_idea_id UUID REFERENCES public.content_ideas(id) ON DELETE SET NULL,
  script_id UUID REFERENCES public.content_scripts(id) ON DELETE SET NULL,
  storyboard_id UUID REFERENCES public.content_storyboards(id) ON DELETE SET NULL,
  video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
  quality_report JSONB DEFAULT '{}'::jsonb,
  page_variations JSONB DEFAULT '[]'::jsonb,
  failed_stage TEXT,
  error_message TEXT,
  estimated_cost NUMERIC(10, 4) DEFAULT 0.0000,
  actual_cost NUMERIC(10, 4) DEFAULT 0.0000,
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_workflows_user_id ON public.automation_workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_workflows_status ON public.automation_workflows(status);
CREATE INDEX IF NOT EXISTS idx_automation_workflows_stage ON public.automation_workflows(current_stage);
CREATE INDEX IF NOT EXISTS idx_automation_workflows_video_id ON public.automation_workflows(video_id);

ALTER TABLE public.automation_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own automation workflows"
  ON public.automation_workflows FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER on_automation_workflows_updated
  BEFORE UPDATE ON public.automation_workflows
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 2. Create workflow_templates table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  niche TEXT,
  configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_templates_user_id ON public.workflow_templates(user_id);

ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own workflow templates"
  ON public.workflow_templates FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER on_workflow_templates_updated
  BEFORE UPDATE ON public.workflow_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 3. Create workflow_logs table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.workflow_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.automation_workflows(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  cost_delta NUMERIC(10, 4) DEFAULT 0.0000,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_logs_workflow_id ON public.workflow_logs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_stage ON public.workflow_logs(stage);

ALTER TABLE public.workflow_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own workflow logs"
  ON public.workflow_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.automation_workflows w
      WHERE w.id = workflow_logs.workflow_id AND w.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.automation_workflows w
      WHERE w.id = workflow_logs.workflow_id AND w.user_id = auth.uid()
    )
  );
