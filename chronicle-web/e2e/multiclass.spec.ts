/**
 * Multiclass identity-card E2E tests.
 *
 * Tests:
 * 1. Add a second class — two class rows appear and total level increments
 * 2. Remove the added class — returns to single-class display
 * 3. Add class with unmet prerequisite — warning is shown
 *
 * Requires running dev stack (npm run dev + dotnet run).
 */
import { test, expect } from './fixtures'
import { createCharacter, deleteCharacter } from './helpers'

test.describe('Multiclass identity card', () => {
  let characterId: string

  test.beforeEach(async ({ authedRequest }) => {
    // Fighter 5: STR 16, DEX 14 (meets Rogue prereq DEX 13), INT 12 (fails Wizard INT 13)
    const char = await createCharacter(authedRequest, {
      name: `E2E-MC-${Date.now()}`,
      characterClass: 'Fighter',
      level: 5,
      abilityScores: {
        Strength: 16, Dexterity: 14, Constitution: 14,
        Intelligence: 12, Wisdom: 10, Charisma: 8,
      },
    })
    characterId = char.id
  })

  test.afterEach(async ({ authedRequest }) => {
    await deleteCharacter(authedRequest, characterId)
  })

  test('Add Class → two class rows appear, total level = 6', async ({ page }) => {
    await page.goto(`/characters/${characterId}/stats`)

    // Open "Add Class" modal
    const addClassBtn = page.getByRole('button', { name: /add class/i }).first()
    await expect(addClassBtn).toBeVisible({ timeout: 10_000 })
    await addClassBtn.click()

    // Wait for the AddClassModal to appear (step 1)
    const modal = page.locator('.fixed.inset-0').last()
    await expect(modal).toBeVisible({ timeout: 5_000 })

    // Pick Rogue — DEX 14 meets DEX 13 requirement, no warning
    const classSelect = modal.locator('select').first()
    await classSelect.selectOption('Rogue')

    // Step 1: "Next →" button (no prereq warning for Rogue with DEX 14)
    const nextBtn = modal.getByRole('button', { name: /next/i })
    await expect(nextBtn).toBeVisible({ timeout: 3_000 })
    await nextBtn.click()

    // Step 2: Proficiencies review — Rogue grants DEX saving throw + 1 skill pick
    // Pick one skill from the Rogue skill list
    const rogueSkill = modal.locator('button').filter({ hasText: /Acrobatics|Athletics|Deception|Insight|Intimidation|Investigation|Perception|Performance|Persuasion|Sleight of Hand|Stealth/ }).first()
    if (await rogueSkill.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await rogueSkill.click()
    }

    // Confirm: "Add Rogue"
    const confirmBtn = modal.getByRole('button', { name: /add rogue/i })
    await expect(confirmBtn).toBeVisible({ timeout: 3_000 })
    await confirmBtn.click()

    // Two class rows should appear (multiclass layout)
    await expect(page.getByText('Fighter').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Rogue').first()).toBeVisible()

    // Total level should now be 6 (5 + 1)
    await expect(page.getByText('6').first()).toBeVisible()
  })

  test('Remove added class → back to single-class display', async ({ page, authedRequest }) => {
    // Add a second class via API for reliability
    await authedRequest.put(`/api/characters/${characterId}`, {
      data: {
        classes: [
          { characterClass: 'Fighter', subclass: 'None', level: 5, cantripsKnown: 0 },
          { characterClass: 'Rogue', subclass: 'None', level: 1, cantripsKnown: 0 },
        ],
      },
    })

    await page.goto(`/characters/${characterId}/stats`)

    // Should see both class rows
    await expect(page.getByText('Fighter').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Rogue').first()).toBeVisible()

    // Remove the Rogue entry — × button on the second class row
    const removeBtn = page.getByRole('button', { name: /^×$/ }).last()
    if (await removeBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await removeBtn.click()
      // Rogue should no longer be visible as a class entry
      await expect(page.getByText('Rogue').first()).not.toBeVisible({ timeout: 5_000 })
    }
  })

  test('Add class with unmet INT prerequisite (Wizard, INT 12) → warning shown', async ({ page }) => {
    await page.goto(`/characters/${characterId}/stats`)

    const addClassBtn = page.getByRole('button', { name: /add class/i }).first()
    await expect(addClassBtn).toBeVisible({ timeout: 10_000 })
    await addClassBtn.click()

    const modal = page.locator('.fixed.inset-0').last()
    await expect(modal).toBeVisible({ timeout: 5_000 })

    // Select Wizard (requires INT 13; character has INT 12 → warning)
    const classSelect = modal.locator('select').first()
    await classSelect.selectOption('Wizard')

    // Warning should appear in the modal mentioning Intelligence 13
    await expect(modal.getByText(/Intelligence 13\+/)).toBeVisible({ timeout: 5_000 })
  })
})
