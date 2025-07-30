-- Fix OTP long expiry warning by setting shorter expiry times
UPDATE auth.config 
SET 
  otp_expiry = 3600,  -- 1 hour instead of default 24 hours
  otp_length = 6      -- Standard 6-digit OTP
WHERE key = 'otp_config';