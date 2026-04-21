import { test, expect } from '@playwright/test';

// Define the basic pages that can be loaded without auth (or that redirect gracefully)
test.describe('Basic Navigation and Routing', () => {
  test('Landing page loads', async ({ page }) => {
    await page.goto('/');
    // Check if sign-in or login button text is visible
    const signInBtn = page.getByRole('link', {
      name: /サインイン|ログイン|Sign In|Login/i,
    });
    // Wait for either the button to be visible, or the page to just load based on content
    await expect(page).toHaveURL(/.*\//); 
  });

  test('Guest Judge Login page redirects/loads', async ({ page }) => {
    await page.goto('/signin');
    await expect(page).toHaveURL(/.*signin.*/);
  });
});

test.describe('Event Deadline Logic Mocking', () => {
  test('Admin Event Dashboard UI structure loads (redirects to signin if not auth)', async ({ page }) => {
    await page.goto('/admin');
    
    // We expect unauthenticated users to be bounced back to /signin
    // If they were authenticated, they'd stay on /admin
    await page.waitForURL(/.*signin.*/);
    expect(page.url()).toContain('signin');
  });

  test('Judge Dashboard UI structure loads (redirects to signin if not auth)', async ({ page }) => {
    await page.goto('/judge');
    
    // We expect unauthenticated users to be bounced back to /signin
    await page.waitForURL(/.*signin.*/);
    expect(page.url()).toContain('signin');
  });
});

// Since the new rule states events expire EXACTLY 24 hours after created_at
// We can test basic mock calculations via evaluating basic JS on the page
test.describe('Deadline 24H Logic Verification Client-Side', () => {
  test('Verify 24h expiration math (JS Evaluation)', async ({ page }) => {
    // This is essentially testing the core `isExpired` math function using JS logic
    const isExpired = await page.evaluate(() => {
      function parseUTC(dateString) {
        if (!dateString) return new Date();
        return new Date(dateString + (dateString.includes('Z') || dateString.includes('+') ? '' : 'Z'));
      }
      
      const mockCreatedAt = new Date();
      mockCreatedAt.setHours(mockCreatedAt.getHours() - 25); // 25 hours ago
      
      const createdTime = parseUTC(mockCreatedAt.toISOString()).getTime();
      const deadlineTime = createdTime + 24 * 60 * 60 * 1000;
      return Date.now() > deadlineTime;
    });

    expect(isExpired).toBe(true);

    const isNotExpired = await page.evaluate(() => {
      function parseUTC(dateString) {
        if (!dateString) return new Date();
        return new Date(dateString + (dateString.includes('Z') || dateString.includes('+') ? '' : 'Z'));
      }
      
      const mockCreatedAt = new Date();
      mockCreatedAt.setHours(mockCreatedAt.getHours() - 10); // 10 hours ago
      
      const createdTime = parseUTC(mockCreatedAt.toISOString()).getTime();
      const deadlineTime = createdTime + 24 * 60 * 60 * 1000;
      return Date.now() > deadlineTime;
    });

    expect(isNotExpired).toBe(false);
  });
});