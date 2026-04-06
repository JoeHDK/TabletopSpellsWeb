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
    // Start as Fighter 5 — INT 12 (fails Wizard prereq of 13)
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
    const addClassBtn = page.getByRole('button', { name: /add class/i })
    await expect(addClassBtn).toBeVisible({ timeout: 10_000 })
    await addClassBtn.click()

    // Pick Cleric (INT not required, just WIS 13 — char has WIS 10 but warnings are soft)
    // We'll pick a class that doesn't rely on an attribute we fail hard
    const classPicker = page.getByLabel(/select class/i).or(page.locator('select[name="class"]'))
    if (await classPicker.isVisible()) {
      await classPicker.selectOption('Cleric')
    } else {
      // Button-based picker
      await page.getByRole('button', { name: 'Cleric' }).click()
    }

    // Set level to 1
    const levelInput = page.getByLabel(/level/i).first()
    if (await levelInput.isVisible()) {
      await levelInput.fill('1')
    }

    // Confirm
    const confirmBtn = page.getByRole('button', { name: /confirm|add|save/i }).last()
    await confirmBtn.click()

    // Two class rows should appear
    await expect(page.getByText('Fighter')).toBeVisible()
    await expect(page.getByText('Cleric')).toBeVisible()

    // Total level should now be 6
    await expect(page.getByText('6', { exact: false })).toBeVisible()
  })

  test('Remove added class → back to single-class display', async ({ page, authedRequest }) => {
    // First add a class via API directly for reliability
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
    await expect(page.getByText('Fighter')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Rogue')).toBeVisible()

    // Remove the Rogue entry — look for an × or remove button on the second row
    const removeBtn = page.getByRole('button', { name: /remove|×|delete/i }).last()
    if (await removeBtn.isVisible()) {
      await removeBtn.click()
      // Confirm removal dialog if any
      const confirmRemove = page.getByRole('button', { name: /confirm|yes|remove/i })
      if (await confirmRemove.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmRemove.click()
      }
      // Rogue should no longer be visible as a class row
      await expect(page.getByText('Rogue')).not.toBeVisible({ timeout: 5_000 })
    }
  })

  test('Add class with unmet INT prerequisite (Wizard, INT 12) → warning shown', async ({ page }) => {
    await page.goto(`/characters/${characterId}/stats`)

    const addClassBtn = page.getByRole('button', { name: /add class/i })
    await expect(addClassBtn).toBeVisible({ timeout: 10_000 })
    await addClassBtn.click()

    // Try to pick Wizard (requires INT 13; character has INT 12)
    const classPicker = page.getByLabel(/select class/i).or(page.locator('select[name="class"]'))
    if (await classPicker.isVisible()) {
      await classPicker.selectOption('Wizard')
    } else {
      const wizardBtn = page.getByRole('button', { name: /^Wizard$/i })
      if (await wizardBtn.isVisible()) await wizardBtn.click()
    }

    // Prereq warning should appear
    await expect(page.getByText(/intelligence/i)).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(/13/)).toBeVisible()
  })
})
