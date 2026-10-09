# Product brief: Larder

Larder is a small inventory tool for a neighbourhood food pantry. Volunteers use it on a phone at the shelves and on a laptop at the intake desk to see what is in stock and to log donations as they arrive.

Brand color: `#A3237F`, a berry magenta. It is the pantry's sign and tote-bag color. Use it as the product's accent, and keep it out of status meaning: success, warning and danger keep their usual roles.

## The screen

Build one complete screen, the **Pantry** screen, as the application's home route.

- **Stock list.** A list of pantry items, each with its name, category and quantity on hand. Seed it with at least six items across at least three categories. Selecting an item shows its details.
- **Item detail.** The selected item's name, category, quantity, and the date it was last restocked.
- **Responsive.** At phone width the list and the detail stack in one column; at laptop width they sit side by side. Nothing scrolls sideways at any width.
- **Log a donation.** A labelled form that adds an item to the list or adds to an existing one. It has a required **Item name** field, a **Quantity** field, and a **Category** chosen from a fixed set (Canned goods, Dry goods, Produce, Toiletries). Submitting without a name shows an error that names the problem, next to the field. A successful submission updates the list.
- **Category control and dialog.** Choose the category with a portalled select, or open the form in a dialog. Either way, the control opens from the keyboard, closes on Escape and returns focus to what opened it.
- **Brand theme.** The screen uses the brand theme in both dark and light mode. The application decides no colors, lengths or shadows of its own outside its theme and token modules.

## Done means

- The application builds for production and the screen works there.
- Ultima's documented checks for the project pass, including its StyleX lint.
- You used only Ultima's public guidance: the hosted docs, `/llms.txt`, Theme Studio's output, the CLI's printed output and the installed skill.
