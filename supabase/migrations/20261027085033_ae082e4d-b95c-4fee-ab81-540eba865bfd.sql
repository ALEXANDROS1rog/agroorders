UPDATE public.subscription_plans
SET features = (SELECT jsonb_agg(f) FROM jsonb_array_elements(features) f WHERE f #>> '{}' NOT IN ('voice_ai','routes','deliveries'))
WHERE slug = 'basic';