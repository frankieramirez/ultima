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

## This run

Ultima's public site for this run is http://127.0.0.1:41041. Treat it as the public host: its docs, /llms.txt, registry and Theme Studio are there. Do not use any other copy of Ultima, and do not search the web for it. npm resolves `ultima-design` to the version served there.

Start in this empty directory. The documented entry command for this layout is:

```bash
npx ultima-design@latest init larder --framework next
```

The brand theme was made in Theme Studio from the brand color. Its Export theme dialog gave this install command:

```bash
npx shadcn@latest add "http://127.0.0.1:41041/r/theme.json?theme=eJyNlM1u2zAQhO9-igUvvlCF5d_Yt7aA0RwMBDXa-4ZaSYQpUiApIW6Qdy8oh5Icu0WO_JazGs2SfJ0AsJask0azHSx4WFsSsqbfPZ13VBhlLNvB6wQAgFXSl1aqHgCwsqGwe7PmkTj0jUV_aTPr6NulyNAK1HQrXyzn9-Xpl9l2s1iutst0lT7M17PVVb8KNd4xM1t-xkxLNkPtb_Xp-l9urvRUPZO9VW-2nxHbRuo7ztP_aifveubPtSks1uV5mI1D7dgO2HQvC2-JphwamQSaOLIy5-DOzlOVNJJDgnWtKLkQDtMjFYbg1-OUww9SLXkpkMNXK1FxGHqwmLvRpvvW47cDPCl6gYPR5vLFUHM1CuJw3Aec_KSiUWg5HEgrw-G70c4odBz6vbHxMzo6yj_09NLN4Z06gSrEw5w34hT3KsJM6iLwjHJslI8Vb1GcPpT67DLSTvoQXBc2cyXW9LEJI0Vtn35HKnO1NC1ZKzNywwQytKewijNWsii74zUMThlxGini9cpROYrmx7MdFwbjYxrtj9nY_Jj3v9DB3pQrmzxXdCTKXO-f1ZYcDbeDySyEpKnxFlVM2lIr44PR90MhSPu9VOGh6E725G3yF8AvMuI"
```

Build the screen in ./larder. Work only in this directory and with the public host above. When you finish, write ./exercise-notes.json (beside ./larder, not inside it) as JSON: { "interventions": [{ "step", "action", "reason" }], "decisions": [{ "choice", "options", "why" }] }. An intervention is any action the guidance or CLI output did not print or link. A decision is any choice about setting up, theming or styling with Ultima that the guidance did not settle and that changed the output; product choices the brief leaves to you, such as data, copy and arrangement, are not decisions here. Empty arrays mean none. Keep scratch files inside this directory.
