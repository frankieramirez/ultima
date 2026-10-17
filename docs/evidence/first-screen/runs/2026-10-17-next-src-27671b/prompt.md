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
- **Brand theme.** The screen uses the brand theme in both dark and light mode. The application decides no colors, lengths or shadows of its own outside its theme and token modules. A breakpoint is the exception: a media query is a named module constant in the file that uses it, as the guidance shows, not a token. Arrangement values are not lengths the application decides: grid track templates such as `minmax(0, 1fr)`, percentages and viewport units such as `100dvh` stay literal in local StyleX, as the guidance writes them.

## Done means

- The application builds for production and the screen works there.
- Ultima's documented checks for the project pass, including its StyleX lint.
- You used only Ultima's public guidance: the hosted docs, `/llms.txt`, Theme Studio's output, the CLI's printed output and the installed skill.

## This run

Ultima's public site for this run is http://127.0.0.1:61619. Treat it as the public host: its docs, /llms.txt, registry and Theme Studio are there. Do not use any other copy of Ultima, and do not search the web for it. npm resolves `ultima-design` to the version served there.

Start in this empty directory. The documented entry command for this layout is:

```bash
npx ultima-design@latest init larder --framework next --layout src
```

The brand theme was made in Theme Studio from the brand color. Its Export theme dialog gave this install command:

```bash
npx shadcn@4.21.4 add "http://127.0.0.1:61619/r/theme.json?theme=eJyNlMtu2zAQRff-igE33lCF3469awsYzcJAUKPdT6ixRJgmhSElxA3y7wVl6-HYCbLkGd7R1R2SrwMAURF77axYw0zGNZPSBf1t6aSmyhnHYg2vAwAAcdQhZ21aACDykuLu5UI2xGMoGcO5zaimb-eiQFZo6VY-nU3uy8ffRqvldDZfzcbz8cNkMZpf9TuixTtmRrOvmKmIU7ThVj9efOTmSk_HZ-Jb9XL1FTGX2t5xPv5UO7joRTgVLmMs8lM3G4_WizWI4UZngYmGEkqdRJp4Yr2X4E8-0DEptYQEi8JQciYShjvKHMGfx6GEX2QqClqhhO-s0Ujoeogmd2dd_a3HH1t4MvQCW2fd-Yux5gtUJGG3iTj5TVlpkCVsyRon4aez3hn0Etq9TeNn9LTT_-jppZ7DhXqFJsYjfHDq0Ow1hKm2WeQp7bE0oakERnV4V2qzS8l6HWJwddjC51jQ-yaCDFVt-jU5uqulq4hZp-S7CaTIh7hqZmx0ltfHqxuccerQUzTXa4_GU2O-P9t-oTPep439Puub7_P2F2rYmvJ5ud8b2hGlvvUvCiZP3e0QOo0hWSoDo2mSZqr05cGYtv1QKbJho018KOqTPXgb_AfEtDLk"
```

Build the screen in ./larder. Work only in this directory and with the public host above. When you finish, write ./exercise-notes.json (beside ./larder, not inside it) as JSON: { "interventions": [{ "step", "action", "reason" }], "decisions": [{ "choice", "options", "why" }] }. An intervention is any action the guidance or CLI output did not print or link. A decision is any choice about setting up, theming or styling with Ultima that the guidance did not settle and that changed the output; product choices the brief leaves to you, such as data, copy and arrangement, are not decisions here. Empty arrays mean none. Keep scratch files inside this directory.
