UPDATE public.subscription_plans
SET features = (SELECT jsonb_agg(f) FROM jsonb_array_elements(features) f WHERE f #>> '{}' NOT IN ('gps_delivery','auto_arrival','advanced_finance'))
WHERE slug = 'pro';