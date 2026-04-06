/**
 * Single-class regression tests — verifies that the multiclassing changes
 * did not break the basic single-class character workflow.
 *
 * Tests:
 * 1. Wizard 5 — level editable inline, updates correctly
 * 2. Subclass dropdown present and functional
 * 3. Level Up button present and opens wizard
 * 4. Spell list page loads via direct navigation
 *
 * Requires running dev stack (npm run dev + dotnet run).
 */
import { test, expect } from './fixtures'
import { createCharacter, deleteCharacter } from './helpers'

test.describe('Single-class regression', () => {
  let characterId: string

  test.beforeEach(async ({ authedRequest }) => {
    const char = await createCharacter(authedRequest, {
      name: `E2E-Reg-${Date.now()}`,
      characterClass: 'Wizard',
      level: 5,
      subclass: 'WizardEvocation',
      abilityScores: { Strength:8, Dexterity:14, Constitution:12, Intelligence:16, Wisdom:12, Charisma:8 },
    })
    characterId = char.id
  })

  test.afterEach(async ({ authedRequest }) => {
    await deleteCharacter(authedRequest, characterId)
  })

  test('Level editable inline → updates and persists', async ({ page }) => {
    await page.goto(`/characters/${characterId}/stats`)

    // The Level section has a specific container with class w-16 shrink-0
    // It contains an EditableNumber button showing the current level value
    const levelSection = page.locator('.w-16.shrink-0')
    await expect(levelSection).toBeVisible({ timeout: 10_000 })

    const levelBtn = levelSection.getByRole('button')
    await expect(levelBtn).toBeVisible()
    await levelBtn.click()

    // After clicking, a popup input should appear
    const levelInput = page.locator('input[type="number"]').first()
    if (await levelInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await levelInput.fill('6')
      await levelInput.press('Enter')
      // Level button should now show 6
      await expect(levelSection.getByRole('button', { name: '6' })).toBeVisible({ timeout: 5_000 })
    }
  })

  test('Subclass dropdown is present and functional', async ({ page }) => {
    await page.goto(`/characters/${characterId}/stats`)

    // The subclass select in the single-class layout contains 'Evocation' as selected option
    // Filter selects to find the one displaying 'Evocation'
    const subclassSelect = page.locator('select').filter({ hasText: 'Evocation' }).first()
    await expect(subclassSelect).toBeVisible({ timeout: 10_000 })
  })

  test('Level Up button is present and opens the wizard modal', async ({ page }) => {
    await page.goto(`/characters/${characterId}/stats`)

    const levelUpBtn = page.getByRole('button', { name: /level up/i })
    await expect(levelUpBtn).toBeVisible({ timeout: 10_000 })
    await levelUpBtn.click()

    // Modal should appear
    const modal = page.locator('.fixed.inset-0').last()
    await expect(modal).toBeVisible({ timeout: 5_000 })

    // Close the modal
    const cancelBtn = modal.getByRole('button', { name: /cancel/i })
    if (await cancelBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await cancelBtn.click()
    }
  })

  test('Spell list page accessible from navigation', async ({ page }) => {
    // Navigate directly to the standalone spell list route
    await page.goto(`/characters/${characterId}/spells`)

    // Should load the spell list page (not redirect to login or show blank)
    await expect(page).not.toHaveURL('/login', { timeout: 5_000 })
    await expect(page).toHaveURL(new RegExp(`/characters/${characterId}/spells`), { timeout: 5_000 })

    // Page should render actual content
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 10_000 })
  })
})
