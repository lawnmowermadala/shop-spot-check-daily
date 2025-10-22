-- Add active column to staff table for soft delete
ALTER TABLE public.staff 
ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_staff_active ON public.staff(active);