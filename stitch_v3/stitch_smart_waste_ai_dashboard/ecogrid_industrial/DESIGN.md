# Design System Document: Industrial Precision & Editorial Depth

## 1. Overview & Creative North Star: "The Sentinel Archive"
This design system moves away from the "utilitarian dashboard" trope and toward a high-end, editorial experience dubbed **"The Sentinel Archive."** In the context of industrial waste management, data is more than just numbers; it is a narrative of environmental impact and operational efficiency.

The system is built on the tension between a heavy, authoritative sidebar (The Sentinel) and a light, airy, and sophisticated workspace (The Archive). We break the "template" look by utilizing **intentional asymmetry**—where large-scale typography meets tight, dense data—and **tonal layering** that replaces traditional borders with sophisticated shifts in surface depth.

---

## 2. Colors: Tonal Depth over Structural Lines
We define boundaries through atmosphere, not lines.

### Palette Strategy
*   **Primary (Navy #050f19 / #1a252f):** Used for the sidebar and high-level branding. It provides an "anchor" of stability.
*   **Secondary (Green #006d37):** Reserved for "Normal" states and efficiency gains.
*   **Tertiary (Amber #190c00):** Used sparingly for warnings and transitional states.
*   **Error (Red #ba1a1a):** High-contrast signals for critical failures or spill risks.

### The "No-Line" Rule
**Prohibit 1px solid borders for sectioning.** To separate a data table from a summary card, use background shifts. For example, a card using `surface_container_lowest` (#ffffff) should sit on a main background of `surface` (#f7fafc). The eye perceives the edge through the change in luminance, creating a cleaner, more premium feel.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of materials. 
1.  **Base Layer:** `surface` (#f7fafc)
2.  **Sectioning:** `surface_container_low` (#f1f4f6) for grouping large content blocks.
3.  **Interactive Elements:** `surface_container_highest` (#e0e3e5) for hover states or active data points.

### The "Glass & Gradient" Rule
To elevate the dark navy sidebar, use a subtle vertical gradient from `primary` (#050f19) to `primary_container` (#1a252f). For floating "Quick Action" menus, apply a **Glassmorphism** effect: 
*   **Background:** `surface_variant` at 70% opacity.
*   **Blur:** `backdrop-filter: blur(12px)`.
*   **Edge:** A 1px "Ghost Border" using `outline_variant` at 15% opacity.

---

## 3. Typography: Data-Dense Sophistication
We use **Inter** to bridge the gap between technical precision and editorial elegance.

*   **Display (Large Scale):** Use `display-md` (2.75rem) for high-level KPIs like "Total Tonnage." This creates a focal point that breaks the monotony of the grid.
*   **Title & Headlines:** `title-lg` (1.375rem) should be used for card headers. Bold weights are reserved for `on_surface` content to ensure authority.
*   **The Data Label:** `label-sm` (0.6875rem) is the workhorse of this system. Use it in All Caps with +0.05em tracking for secondary metadata to create a "technical blueprint" aesthetic.
*   **Readability:** For complex data tables, use `body-md` (0.875rem). The increased x-height of Inter ensures legibility even when rows are tightly packed.

---

## 4. Elevation & Depth: Tonal Layering
Traditional shadows are often "dirty." In this system, depth is clean and atmospheric.

*   **Layering Principle:** Instead of a shadow, place a `surface_container_lowest` card on a `surface_container` background. The subtle 2-3% difference in lightness creates "Soft Lift."
*   **Ambient Shadows:** For floating modals, use an extra-diffused shadow: `box-shadow: 0 20px 40px rgba(24, 28, 30, 0.06)`. The tint is derived from `on_surface`, making it feel like a natural environmental occlusion rather than a black drop-shadow.
*   **Ghost Borders:** If accessibility requires a container boundary, use `outline_variant` (#c4c6cb) at **10% opacity**. It should be felt, not seen.

---

## 5. Components: Refined Industrial Primitives

### Data Cards
*   **Structure:** No borders. Use `surface_container_lowest` with `xl` (0.75rem) corner radius.
*   **Header:** Use a `primary` colored 4px vertical accent bar on the left side of the card to denote the "Active" category.

### Complex Data Tables
*   **No Dividers:** Forbid horizontal lines between rows. Use alternating row colors: `surface` for odd and `surface_container_low` for even.
*   **Row Highlighting:** On hover, shift the background to `primary_fixed` (#d8e4f1) at 40% opacity. This provides a clear, soft "glow" to the active data.

### Status Badges & Chips
*   **Success:** `secondary_container` background with `on_secondary_container` text.
*   **Critical:** `error_container` background with `on_error_container` text.
*   **Shape:** Use `full` (9999px) roundedness for a pill shape, contrasting against the more geometric `md` (0.375rem) buttons.

### Progress Bars
*   **Track:** `surface_container_high`.
*   **Indicator:** Use a subtle linear gradient (e.g., `secondary` to `secondary_fixed_dim`) to give the progress bar "volume" and a tactile, liquid feel—apt for waste management.

---

## 6. Do’s and Don’ts

### Do:
*   **Use Generous White Space:** Use the typography scale to create "breathing rooms" between high-density data modules.
*   **Embrace Tonal Shifts:** Use the `surface_container` tiers to guide the user's eye from the general to the specific.
*   **Align to a Rigid Baseline:** While the layout is asymmetrical, the internal alignment of text must be mathematically perfect to maintain an "industrial" feel.

### Don't:
*   **Don't Use Pure Black Shadows:** This kills the "Archive" sophistication. Use tinted, low-opacity ambient shadows only.
*   **Don't Use 1px Borders:** Never use a solid hex code for a border to separate content. Use the "No-Line" background shift rule.
*   **Don't Use Standard Colors for Icons:** Icons should use `on_surface_variant` (#44474b) unless they are signaling a specific status (Red/Amber/Green). This prevents the UI from looking "cluttered" or "rainbow-like."