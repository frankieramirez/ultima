/**
 * `docs` is printed by the shadcn CLI after an install.
 */

export type RegistryItemDescription = {
  title: string;
  description: string;
  docs: string;
  /** Setup items only: their files are authored, so their npm packages cannot be derived. */
  dependencies?: string[];
  devDependencies?: string[];
  /** Element items only: a vendored bundle has no imports to derive from, so the tokens-css URL is declared here. */
  registryDependencies?: string[];
};

export const items: Record<string, RegistryItemDescription> = {
  tokens: {
    title: 'Ultima tokens',
    description: "Ultima's design tokens and the dark and light themes, as StyleX variables.",
    docs: "import { color, space, text } from '@/lib/tokens.stylex';\nimport { colorScheme, darkTheme, lightTheme } from '@/lib/themes';\n\nApply colorScheme to <html> and a theme to any subtree to pin it.",
  },
  lib: {
    title: 'Ultima component helpers',
    description: 'The shared prop types every Ultima component is built on.',
    docs: "import type { PartProps, PlainProps, StyleProp } from '@/lib/component';",
  },
  button: {
    title: 'Button',
    description: 'A button in three variants, three sizes, and two tones, on Base UI.',
    docs: "import { Button } from '@/components/ui/button';\n\n<Button variant=\"solid\" size=\"md\" tone=\"accent\">Save</Button>",
  },
  'dropdown-menu': {
    title: 'Dropdown Menu',
    description: 'A keyboard-navigable menu with items, submenus, and selection controls, on Base UI.',
    docs: "import { Button } from '@/components/ui/button';\nimport { DropdownMenu } from '@/components/ui/dropdown-menu';\n\n<DropdownMenu.Root>\n  <DropdownMenu.Trigger render={<Button />}>Actions</DropdownMenu.Trigger>\n  <DropdownMenu.Portal>\n    <DropdownMenu.Positioner>\n      <DropdownMenu.Popup>\n        <DropdownMenu.Item>Settings</DropdownMenu.Item>\n      </DropdownMenu.Popup>\n    </DropdownMenu.Positioner>\n  </DropdownMenu.Portal>\n</DropdownMenu.Root>",
  },
  badge: {
    title: 'Badge',
    description: 'A small static label in two variants and six tones.',
    docs: "import { Badge } from '@/components/ui/badge';\n\n<Badge variant=\"subtle\" tone=\"success\">Passing</Badge>",
  },
  card: {
    title: 'Card',
    description: 'A surface with a header, body, and footer for grouping related content.',
    docs: "import { Card } from '@/components/ui/card';\n\n<Card.Root>\n  <Card.Header>\n    <Card.Title>Ultima</Card.Title>\n    <Card.Description>A design system.</Card.Description>\n  </Card.Header>\n  <Card.Body>Anything.</Card.Body>\n</Card.Root>",
  },
  collapsible: {
    title: 'Collapsible',
    description: 'A disclosure that animates its panel open and closed, on Base UI.',
    docs: "import { Button } from '@/components/ui/button';\nimport { Collapsible } from '@/components/ui/collapsible';\n\n<Collapsible.Root>\n  <Collapsible.Trigger render={<Button variant=\"ghost\" />}>Details</Collapsible.Trigger>\n  <Collapsible.Panel>Anything.</Collapsible.Panel>\n</Collapsible.Root>",
  },
  code: {
    title: 'Code',
    description: 'Monospaced code, inline in a sentence or as a block.',
    docs: "import { Code } from '@/components/ui/code';\n\n<Code>npx shadcn add @ultima/button</Code>\n<Code variant=\"block\">{source}</Code>",
  },
  field: {
    title: 'Field',
    description: 'A label, description, and error bound to one control, on Base UI.',
    docs: "import { Field } from '@/components/ui/field';\nimport { Input } from '@/components/ui/input';\n\n<Field.Root name=\"email\">\n  <Field.Label>Email</Field.Label>\n  <Input type=\"email\" required />\n  <Field.Description>We never share this.</Field.Description>\n  <Field.Error />\n</Field.Root>",
  },
  fieldset: {
    title: 'Fieldset',
    description: 'A legend and related controls as a real fieldset, on Base UI.',
    docs: "import { Field } from '@/components/ui/field';\nimport { Fieldset } from '@/components/ui/fieldset';\nimport { Input } from '@/components/ui/input';\n\n<Fieldset.Root>\n  <Fieldset.Legend>Account</Fieldset.Legend>\n  <Field.Root name=\"email\">\n    <Field.Label>Email</Field.Label>\n    <Input type=\"email\" />\n  </Field.Root>\n</Fieldset.Root>",
  },
  alert: {
    title: 'Alert',
    description: 'A static in-page callout in six tones.',
    docs: "import { Alert } from '@/components/ui/alert';\n\n<Alert.Root tone=\"warning\">\n  <Alert.Title>Disk almost full</Alert.Title>\n  <Alert.Description>87% of 500 GB used.</Alert.Description>\n</Alert.Root>",
  },
  'alert-dialog': {
    title: 'Alert Dialog',
    description: 'A confirmation overlay that Escape closes and a backdrop click does not, on Base UI.',
    docs: "import { AlertDialog } from '@/components/ui/alert-dialog';\nimport { Button } from '@/components/ui/button';\n\n<AlertDialog.Root>\n  <AlertDialog.Trigger render={<Button />}>Delete report</AlertDialog.Trigger>\n  <AlertDialog.Portal>\n    <AlertDialog.Backdrop />\n    <AlertDialog.Viewport>\n      <AlertDialog.Popup>\n        <AlertDialog.Title>Delete report</AlertDialog.Title>\n        <AlertDialog.Description>This cannot be undone.</AlertDialog.Description>\n        <AlertDialog.Close render={<Button variant=\"ghost\" />}>Cancel</AlertDialog.Close>\n        <AlertDialog.Close render={<Button tone=\"danger\" />}>Delete</AlertDialog.Close>\n      </AlertDialog.Popup>\n    </AlertDialog.Viewport>\n  </AlertDialog.Portal>\n</AlertDialog.Root>",
  },
  slider: {
    title: 'Slider',
    description: 'A value picker with one thumb per value and an accent fill, on Base UI.',
    docs: "import { Slider } from '@/components/ui/slider';\n\n<Slider.Root defaultValue={40}>\n  <Slider.Label>Volume</Slider.Label>\n  <Slider.Value />\n  <Slider.Control>\n    <Slider.Track>\n      <Slider.Indicator />\n      <Slider.Thumb />\n    </Slider.Track>\n  </Slider.Control>\n</Slider.Root>\n\nFor a range, pass an array to defaultValue and render one Thumb per value with its own index.",
  },
  progress: {
    title: 'Progress',
    description: 'A task completion bar in five tones, determinate or indeterminate, on Base UI.',
    docs: 'import { Progress } from \'@/components/ui/progress\';\n\n<Progress.Root value={64} tone="highlight">\n  <Progress.Label>Uploading</Progress.Label>\n  <Progress.Track>\n    <Progress.Indicator />\n  </Progress.Track>\n  <Progress.Value />\n</Progress.Root>\n\nPass value={null} for an indeterminate bar.',
  },
  toast: {
    title: 'Toast',
    description: 'A stacked notification in six tones, queued from a manager, on Base UI.',
    docs: "import { Button } from '@/components/ui/button';\nimport { Toast } from '@/components/ui/toast';\n\nMount Provider, Portal, and Viewport once; they stay mounted when the stack is empty.\n\n<Toast.Provider>\n  <Toast.Portal>\n    <Toast.Viewport>{/* map Toast.useToastManager().toasts to Toast.Root */}</Toast.Viewport>\n  </Toast.Portal>\n</Toast.Provider>\n\nToast.useToastManager().add({ title: 'Report exported', type: 'success' });",
  },
  skeleton: {
    title: 'Skeleton',
    description: 'A sunken placeholder that pulses while its content loads.',
    docs: "import { Skeleton } from '@/components/ui/skeleton';\n\n<Skeleton />\n\nSize it through the style slot, and put aria-busy on the container it stands in for. The pulse stops under prefers-reduced-motion.",
  },
  spinner: {
    title: 'Spinner',
    description: 'A looping loading mark drawn in CSS, sized and colored by its surrounding text.',
    docs: "import { Spinner } from '@/components/ui/spinner';\n\n<Spinner />\n\nThe mark is aria-hidden. Put aria-busy on the container being waited on, and announce the wait through a live region rather than the glyph.",
  },
  empty: {
    title: 'Empty',
    description: 'A centered placeholder for a collection with nothing in it.',
    docs: "import { Button } from '@/components/ui/button';\nimport { Empty } from '@/components/ui/empty';\n\n<Empty.Root>\n  <Empty.Title>No reports yet</Empty.Title>\n  <Empty.Description>Run an audit to see its findings here.</Empty.Description>\n  <Button>Run an audit</Button>\n</Empty.Root>\n\nThe action is children, a Button, not a part.",
  },
  checkbox: {
    title: 'Checkbox',
    description: 'A checkbox with a check, a dash for mixed, and an optional group, on Base UI.',
    docs: "import { Checkbox } from '@/components/ui/checkbox';\n\n<label>\n  Accept terms\n  <Checkbox.Root>\n    <Checkbox.Indicator />\n  </Checkbox.Root>\n</label>",
  },
  'radio-group': {
    title: 'Radio Group',
    description: 'A radio group with a filled-circle indicator, on Base UI.',
    docs: "import { RadioGroup } from '@/components/ui/radio-group';\n\n<RadioGroup.Root aria-label=\"Plan\" defaultValue=\"pro\">\n  <RadioGroup.Item value=\"hobby\">\n    <RadioGroup.Indicator />\n  </RadioGroup.Item>\n  <RadioGroup.Item value=\"pro\">\n    <RadioGroup.Indicator />\n  </RadioGroup.Item>\n</RadioGroup.Root>",
  },
  combobox: {
    title: 'Combobox',
    description: 'A filterable input whose value is restricted to the item set, on Base UI.',
    docs: "import { Combobox } from '@/components/ui/combobox';\n\n<Combobox.Root items={['Apple', 'Banana']}>\n  <Combobox.InputGroup>\n    <Combobox.Input placeholder=\"Search fruit\" />\n    <Combobox.Clear />\n    <Combobox.Trigger>\n      <Combobox.Icon />\n    </Combobox.Trigger>\n  </Combobox.InputGroup>\n  <Combobox.Portal>\n    <Combobox.Positioner>\n      <Combobox.Popup>\n        <Combobox.Empty>No fruit matches.</Combobox.Empty>\n        <Combobox.List>\n          {(item) => (\n            <Combobox.Item key={item} value={item}>\n              <Combobox.ItemIndicator />\n              {item}\n            </Combobox.Item>\n          )}\n        </Combobox.List>\n      </Combobox.Popup>\n    </Combobox.Positioner>\n  </Combobox.Portal>\n</Combobox.Root>",
  },
  textarea: {
    title: 'Textarea',
    description: 'A multiline text field in three sizes, on Base UI.',
    docs: 'import { Textarea } from \'@/components/ui/textarea\';\n\n<label htmlFor="bio">Biography</label>\n<Textarea id="bio" size="md" />',
  },
  input: {
    title: 'Input',
    description: 'A text input in three sizes, on Base UI.',
    docs: 'import { Input } from \'@/components/ui/input\';\n\n<label htmlFor="email">Email</label>\n<Input id="email" size="md" />',
  },
  meter: {
    title: 'Meter',
    description: 'A bounded measurement as a toned bar, on Base UI.',
    docs: 'import { Meter } from \'@/components/ui/meter\';\n\n<Meter.Root value={72} tone="warning">\n  <Meter.Label>Disk used</Meter.Label>\n  <Meter.Track>\n    <Meter.Indicator />\n  </Meter.Track>\n  <Meter.Value />\n</Meter.Root>',
  },
  stat: {
    title: 'Stat',
    description: 'A single number with its label, for dashboards and summaries.',
    docs: "import { Stat } from '@/components/ui/stat';\n\n<Stat.Root>\n  <Stat.Label>Tokens</Stat.Label>\n  <Stat.Value>95</Stat.Value>\n</Stat.Root>",
  },
  select: {
    title: 'Select',
    description: 'A form control for choosing a predefined value from a popup list.',
    docs: "import { Select } from '@/components/ui/select';\n\n<Select.Root>\n  <Select.Label>Fruit</Select.Label>\n  <Select.Trigger>\n    <Select.Value placeholder=\"Pick a fruit\" />\n    <Select.Icon />\n  </Select.Trigger>\n  <Select.Portal>\n    <Select.Positioner>\n      <Select.Popup>\n        <Select.List>\n          <Select.Item value=\"apple\">\n            <Select.ItemIndicator />\n            <Select.ItemText>Apple</Select.ItemText>\n          </Select.Item>\n        </Select.List>\n      </Select.Popup>\n    </Select.Positioner>\n  </Select.Portal>\n</Select.Root>",
  },
  switch: {
    title: 'Switch',
    description: 'An on-off toggle with a sliding thumb, on Base UI.',
    docs: "import { Switch } from '@/components/ui/switch';\n\n<label>\n  Notifications\n  <Switch.Root>\n    <Switch.Thumb />\n  </Switch.Root>\n</label>",
  },
  table: {
    title: 'Table',
    description: 'A data table as native table parts, with an optional caption and scroll region.',
    docs: "import { Table } from '@/components/ui/table';\n\n<Table.Root>\n  <Table.Caption>Latency by region</Table.Caption>\n  <Table.Head>\n    <Table.Row>\n      <Table.HeadCell>Region</Table.HeadCell>\n    </Table.Row>\n  </Table.Head>\n  <Table.Body>\n    <Table.Row>\n      <Table.Cell>us-east-1</Table.Cell>\n    </Table.Row>\n  </Table.Body>\n</Table.Root>",
  },
  tabs: {
    title: 'Tabs',
    description: 'Tabbed sections in an underline or a segmented variant, on Base UI.',
    docs: 'import { Tabs } from \'@/components/ui/tabs\';\n\n<Tabs.Root variant="underline" defaultValue="tokens">\n  <Tabs.List>\n    <Tabs.Tab value="tokens">Tokens</Tabs.Tab>\n    <Tabs.Tab value="themes">Themes</Tabs.Tab>\n    <Tabs.Indicator />\n  </Tabs.List>\n  <Tabs.Panel value="tokens">Anything.</Tabs.Panel>\n</Tabs.Root>',
  },
  'toggle-group': {
    title: 'Toggle Group',
    description: 'A segmented group of toggle buttons with roving focus, on Base UI.',
    docs: 'import { ToggleGroup } from \'@/components/ui/toggle-group\';\n\n<ToggleGroup.Root aria-label="Layout" defaultValue={[\'list\']}>\n  <ToggleGroup.Item value="list">List</ToggleGroup.Item>\n  <ToggleGroup.Item value="grid">Grid</ToggleGroup.Item>\n</ToggleGroup.Root>',
  },
  separator: {
    title: 'Separator',
    description: 'A horizontal or vertical divider between sections of content.',
    docs: "import { Separator } from '@/components/ui/separator';\n\n<Separator />",
  },
  tooltip: {
    title: 'Tooltip',
    description: 'A short overlay on hover or focus, labelled through aria-label on its trigger.',
    docs: "import { Tooltip } from '@/components/ui/tooltip';\n\n<Tooltip.Provider>\n  <Tooltip.Root>\n    <Tooltip.Trigger aria-label=\"Copied\" render={<Button />}>Copy</Tooltip.Trigger>\n    <Tooltip.Portal>\n      <Tooltip.Positioner>\n        <Tooltip.Popup>Copied</Tooltip.Popup>\n      </Tooltip.Positioner>\n    </Tooltip.Portal>\n  </Tooltip.Root>\n</Tooltip.Provider>",
  },
  dialog: {
    title: 'Dialog',
    description: 'A modal overlay with a title, a description, and a close slot rendered by the caller.',
    docs: "import { Dialog } from '@/components/ui/dialog';\n\n<Dialog.Root>\n  <Dialog.Trigger render={<Button />}>Open</Dialog.Trigger>\n  <Dialog.Portal>\n    <Dialog.Backdrop />\n    <Dialog.Viewport>\n      <Dialog.Popup>\n        <Dialog.Title>Title</Dialog.Title>\n        <Dialog.Description>Description</Dialog.Description>\n        <Dialog.Close render={<Button variant=\"ghost\">Close</Button>} />\n      </Dialog.Popup>\n    </Dialog.Viewport>\n  </Dialog.Portal>\n</Dialog.Root>",
  },
  sidebar: {
    title: 'Sidebar',
    description: 'A collapsible navigation panel with groups, nested lists, and an active-page indication.',
    docs: "import { Button } from '@/components/ui/button';\nimport { Sidebar, useSidebar } from '@/components/ui/sidebar';\n\n<Sidebar.Root>\n  <Sidebar.Trigger render={<Button variant=\"ghost\" aria-label=\"Toggle navigation\" />} />\n  <Sidebar.Panel aria-label=\"Main\">\n    <Sidebar.Group>\n      <Sidebar.GroupLabel>Reference</Sidebar.GroupLabel>\n      <Sidebar.List>\n        <Sidebar.Item>\n          <Sidebar.Link href=\"/tokens\" active>Tokens</Sidebar.Link>\n        </Sidebar.Item>\n      </Sidebar.List>\n    </Sidebar.Group>\n  </Sidebar.Panel>\n</Sidebar.Root>",
  },
  breadcrumb: {
    title: 'Breadcrumb',
    description: 'A trail of links to the current page, with a swappable separator glyph.',
    docs: "import { Breadcrumb } from '@/components/ui/breadcrumb';\n\n<Breadcrumb.Root>\n  <Breadcrumb.List>\n    <Breadcrumb.Item>\n      <Breadcrumb.Link href=\"/\">Home</Breadcrumb.Link>\n    </Breadcrumb.Item>\n    <Breadcrumb.Separator />\n    <Breadcrumb.Item>\n      <Breadcrumb.Link href=\"/settings\" active>Settings</Breadcrumb.Link>\n    </Breadcrumb.Item>\n  </Breadcrumb.List>\n</Breadcrumb.Root>\n\nRoot carries aria-label=\"Breadcrumb\" unless you name it yourself. A second trail on one page needs its own name.",
  },
  pagination: {
    title: 'Pagination',
    description: 'A page window with truncation, disabled ends, and a pure function that computes the window.',
    docs: "import { Pagination } from '@/components/ui/pagination';\n\n<Pagination.Root>\n  <Pagination.List>\n    <Pagination.Item>\n      <Pagination.Previous href=\"?page=1\" disabled>Previous</Pagination.Previous>\n    </Pagination.Item>\n    {Pagination.getPages({ page, count }).map((entry, index) =>\n      entry.type === 'ellipsis' ? (\n        <Pagination.Item key={`gap-${index}`}><Pagination.Ellipsis /></Pagination.Item>\n      ) : (\n        <Pagination.Item key={entry.page}>\n          <Pagination.Page href={`?page=${entry.page}`} current={entry.page === page}>{entry.page}</Pagination.Page>\n        </Pagination.Item>\n      ),\n    )}\n    <Pagination.Item>\n      <Pagination.Next href=\"?page=2\">Next</Pagination.Next>\n    </Pagination.Item>\n  </Pagination.List>\n</Pagination.Root>\n\ngetPages is pure arithmetic and you render the result, so a page item can be your router's link. Root carries aria-label=\"Pagination\" unless you name it yourself, and a second control on one page needs its own name. Do not render an Ultima Button into these parts: two Ultima styles collide rather than cascade.",
  },
  'navigation-menu': {
    title: 'Navigation Menu',
    description: 'A top-level navigation whose panels morph between one another, on two nav landmarks.',
    docs: "import { NavigationMenu } from '@/components/ui/navigation-menu';\n\n<NavigationMenu.Root aria-label=\"Main\">\n  <NavigationMenu.List>\n    <NavigationMenu.Item>\n      <NavigationMenu.Trigger>Components<NavigationMenu.Icon /></NavigationMenu.Trigger>\n      <NavigationMenu.Content>\n        <NavigationMenu.Link href=\"/components/button\">Button</NavigationMenu.Link>\n      </NavigationMenu.Content>\n    </NavigationMenu.Item>\n  </NavigationMenu.List>\n  <NavigationMenu.Portal>\n    <NavigationMenu.Positioner sideOffset={8}>\n      <NavigationMenu.Popup>\n        <NavigationMenu.Arrow />\n        <NavigationMenu.Viewport />\n      </NavigationMenu.Popup>\n    </NavigationMenu.Positioner>\n  </NavigationMenu.Portal>\n</NavigationMenu.Root>\n\nOne Portal for the whole menu, not one per Item: the active Content is portalled into the Viewport. Name Root yourself; Popup carries aria-label=\"Submenu\" unless you name it. Portalling needs isolation: isolate on your app root and body { position: relative } for iOS 26 Safari.",
  },
  popover: {
    title: 'Popover',
    description: 'An anchored panel of rich content, opened from a control and dismissed without blocking the page.',
    docs: "import { Popover } from '@/components/ui/popover';\n\n<Popover.Root>\n  <Popover.Trigger render={<Button />}>Share</Popover.Trigger>\n  <Popover.Portal>\n    <Popover.Positioner sideOffset={8}>\n      <Popover.Popup>\n        <Popover.Arrow />\n        <Popover.Title>Share this report</Popover.Title>\n        <Popover.Description>Anyone with the link can read it.</Popover.Description>\n      </Popover.Popup>\n    </Popover.Positioner>\n  </Popover.Portal>\n</Popover.Root>\n\nTrigger and Close are unstyled slots: render an Ultima Button or an element with its own focus ring. Name the popup with Popover.Title, or with aria-label on Popup when it has no visible heading. openOnHover, delay, and closeDelay are Trigger props, not Root's.",
  },
  drawer: {
    title: 'Drawer',
    description: 'An edge-anchored panel with swipe gestures, snap points, and the Android back gesture, on Base UI.',
    docs: "import { Button } from '@/components/ui/button';\nimport { Drawer } from '@/components/ui/drawer';\n\n<Drawer.Root>\n  <Drawer.Trigger render={<Button />}>Filters</Drawer.Trigger>\n  <Drawer.Portal>\n    <Drawer.Backdrop />\n    <Drawer.Viewport>\n      <Drawer.Popup>\n        <Drawer.Title>Filters</Drawer.Title>\n        <Drawer.Description>Narrow the report to one team.</Drawer.Description>\n        <Drawer.Close render={<Button variant=\"ghost\" />}>Done</Drawer.Close>\n      </Drawer.Popup>\n    </Drawer.Viewport>\n  </Drawer.Portal>\n</Drawer.Root>\n\nRoot > Portal > Viewport > Popup is the minimum spine: without the Viewport the swipe gesture and touch scroll locking are both off. swipeDirection is the direction the drawer is dismissed toward, which is the edge it sits on, and its values are physical: 'down' by default, or 'up', 'left', 'right'. Trigger and Close are unstyled slots: render an Ultima Button or an element with its own focus ring. Ship a Trigger alongside any SwipeArea, because swiping a drawer open has no keyboard equivalent. Indent and IndentBackground pass through unstyled; the app-shell CSS that animates them is on the documentation page. Portalling needs isolation: isolate on your app root and body { position: relative } for iOS 26 Safari.",
  },
  'context-menu': {
    title: 'Context Menu',
    description: 'A menu opened by right click or long press, anchored to the pointer rather than to a control.',
    docs: "import { ContextMenu } from '@/components/ui/context-menu';\n\n<ContextMenu.Root>\n  <ContextMenu.Trigger>Quarterly report</ContextMenu.Trigger>\n  <ContextMenu.Portal>\n    <ContextMenu.Backdrop />\n    <ContextMenu.Positioner>\n      <ContextMenu.Popup aria-label=\"Quarterly report\">\n        <ContextMenu.Item>Rename</ContextMenu.Item>\n        <ContextMenu.Separator />\n        <ContextMenu.Item>Archive</ContextMenu.Item>\n      </ContextMenu.Popup>\n    </ContextMenu.Positioner>\n  </ContextMenu.Portal>\n</ContextMenu.Root>\n\nTrigger is the region you right-click, wrapping your own content: no role, no ARIA, not focusable, and never a Button. Put the same actions on a visible control too, or a keyboard user cannot reach them. Name the popup with aria-label; a submenu popup is named by its SubmenuTrigger. Portalling needs isolation: isolate on your app root and body { position: relative } for iOS 26 Safari.",
  },
  'hover-card': {
    title: 'Hover Card',
    description: 'A preview of where a link goes, opened by hovering or focusing the link itself.',
    docs: "import { HoverCard } from '@/components/ui/hover-card';\n\n<p>\n  The gate is documented in the{' '}\n  <HoverCard.Root>\n    <HoverCard.Trigger href=\"/docs/contrast-gate\">contrast gate</HoverCard.Trigger>\n    <HoverCard.Portal>\n      <HoverCard.Positioner sideOffset={8}>\n        <HoverCard.Popup>\n          <HoverCard.Arrow />\n          Every semantic pairing is checked against WCAG AA before a palette ships.\n        </HoverCard.Popup>\n      </HoverCard.Positioner>\n    </HoverCard.Portal>\n  </HoverCard.Root>{' '}\n  section, which lists the pairings it covers.\n</p>\n\nTrigger is the link itself, an <a> with your own href, styled by Ultima and underlined because it sits in your prose. It is the one Ultima link that underlines. Put everything the card shows at that destination too: the card never opens on touch, and a screen reader reads its content as unlabelled text, so the link must be the whole story on its own. There is no Title, no Description, and no Close. delay and closeDelay are Trigger props, defaulting to 600 and 300.",
  },
  menubar: {
    title: 'Menubar',
    description: 'A persistent bar of menu titles, holding your own Dropdown Menus and sized to its triggers.',
    docs: "import { Menubar } from '@/components/ui/menubar';\n\n<Menubar aria-label=\"Document\">\n  <DropdownMenu.Root>\n    <DropdownMenu.Trigger render={<Button variant=\"ghost\" size=\"sm\" />}>File</DropdownMenu.Trigger>\n    <DropdownMenu.Portal>\n      <DropdownMenu.Positioner>\n        <DropdownMenu.Popup>\n          <DropdownMenu.Item>New</DropdownMenu.Item>\n        </DropdownMenu.Popup>\n      </DropdownMenu.Positioner>\n    </DropdownMenu.Portal>\n  </DropdownMenu.Root>\n</Menubar>\n\nThe menus are yours: install @ultima/dropdown-menu alongside this, because the bar declares no dependency on it and ships none of its paint. One component, no parts. The accessible name is required by the types, as aria-label or aria-labelledby. The bar is sized to its triggers, since a modal menu cuts its backdrop hole from that box; set an inline size through style for full-bleed chrome.",
  },
  accordion: {
    title: 'Accordion',
    description: 'Disclosure sections under one shared value, on Base UI, with the heading level left to you.',
    docs: "import { Accordion } from '@/components/ui/accordion';\n\n<Accordion.Root>\n  <Accordion.Item value=\"a\">\n    <Accordion.Header>\n      <Accordion.Trigger>Details</Accordion.Trigger>\n    </Accordion.Header>\n    <Accordion.Panel>\n      <div style={{ padding: '1rem' }}>Anything.</div>\n    </Accordion.Panel>\n  </Accordion.Item>\n</Accordion.Root>\n\nThe heading level is yours: Header renders an h3 by default, change it through render. Do not pass a Button through render on Trigger; it is the styled control and paints its own full-measure row. The panel's content padding goes on a wrapper inside the panel, never on the panel itself.",
  },
  avatar: {
    title: 'Avatar',
    description: 'An image that falls back to whatever you put behind it, at whatever size you set.',
    docs: "import { Avatar } from '@/components/ui/avatar';\n\n<Avatar.Root>\n  <Avatar.Fallback>FR</Avatar.Fallback>\n  <Avatar.Image src=\"/avatar.png\" alt=\"Frankie\" />\n</Avatar.Root>\n\nFallback goes before Image in DOM order; the not-yet-loaded image is hidden with visibility, never display, so keepMounted and lazy loading work. alt is yours: empty beside a visible name, a name when the avatar stands alone. The box and the radius are the style slot: there is no size or shape prop.",
  },
  'scroll-area': {
    title: 'Scroll Area',
    description: 'A native scroll container with scrollbars you can see and a viewport a keyboard can reach.',
    docs: "import { ScrollArea } from '@/components/ui/scroll-area';\n\n<ScrollArea.Root style={styles.bounds}>\n  <ScrollArea.Viewport>\n    <ScrollArea.Content>Anything.</ScrollArea.Content>\n  </ScrollArea.Viewport>\n  <ScrollArea.Scrollbar>\n    <ScrollArea.Thumb />\n  </ScrollArea.Scrollbar>\n</ScrollArea.Root>\n\nThe bound is yours: give Root a block size through the style slot, or nothing scrolls. A horizontal bar is a second Scrollbar with orientation=\"horizontal\", and Corner fills the intersection when both overflow. The bar is visible whenever its axis overflows; there is no type prop and no hide delay.",
  },
  toggle: {
    title: 'Toggle',
    description: 'A two-state button in two variants and three sizes, on Base UI.',
    docs: 'import { Toggle } from \'@/components/ui/toggle\';\n\n<Toggle>Bold</Toggle>\n\nThe name is the text content; an icon-only toggle passes aria-label and squares the box with a style override on paddingInline. There is no value prop: value identifies a toggle to a ToggleGroup, and a toggle inside one is ToggleGroup.Item, which keeps both.',
  },
  'color-field': {
    title: 'Color Field',
    description: 'An opaque sRGB color control: a swatch trigger, a hex input, and a picker popover.',
    docs: "import { ColorField } from '@/components/ui/color-field';\n\n<ColorField.Root defaultValue=\"#3366ff\">\n  <ColorField.Swatch aria-label=\"Pick accent\" />\n  <ColorField.Input aria-label=\"Hex\" />\n  <ColorField.Portal>\n    <ColorField.Positioner sideOffset={8}>\n      <ColorField.Popup>\n        <ColorField.Picker />\n      </ColorField.Popup>\n    </ColorField.Positioner>\n  </ColorField.Portal>\n</ColorField.Root>\n\nThe value is an opaque sRGB #rrggbb string. size is sm, md, or lg on Root. Name the swatch with aria-label; the popup defaults to aria-label=\"Color picker\". Input fills Field's control slot, so invalid hex carries the validation state. There is no alpha and no wide-gamut format.",
  },
  'aspect-ratio': {
    title: 'Aspect Ratio',
    description: 'A fixed-ratio box for media, with the box and the radius left to the style slot.',
    docs: "import { AspectRatio } from '@/components/ui/aspect-ratio';\n\n<AspectRatio ratio={16 / 9}>\n  <img src=\"/cover.png\" alt=\"Ridgeline at dusk\" />\n</AspectRatio>\n\nratio is a number written inline as aspect-ratio, the file's one runtime declaration. The box and the radius go through the style slot, and render swaps the div for your own element, like a figure.",
  },
  command: {
    title: 'Command',
    description: 'A free-text action palette: an input that filters a list of actions, anchored or inline, on Base UI.',
    docs: "import { Command } from '@/components/ui/command';\n\n<Command.Root items={['New file', 'Open report', 'Export PDF']}>\n  <Command.InputGroup>\n    <Command.Input placeholder=\"Search actions\" aria-label=\"Search actions\" />\n    <Command.Clear aria-label=\"Clear\" />\n    <Command.Trigger aria-label=\"Open actions\">\n      <Command.Icon />\n    </Command.Trigger>\n  </Command.InputGroup>\n  <Command.Portal>\n    <Command.Positioner>\n      <Command.Popup>\n        <Command.Empty>No action matches.</Command.Empty>\n        <Command.List>\n          {(action) => <Command.Item key={action} value={action}>{action}</Command.Item>}\n        </Command.List>\n      </Command.Popup>\n    </Command.Positioner>\n  </Command.Portal>\n</Command.Root>\n\nFor the palette, render the list in place: <Command.Root open inline items={...}> and drop Portal, Positioner, and Popup. The filter prop takes your own scorer; without it the default Collator filter runs.",
  },
  calendar: {
    title: 'Calendar',
    description: 'An inline day, month, and year grid for picking dates, on Zag.',
    docs: "import { Calendar } from '@/components/ui/calendar';\n\n<Calendar.Root>\n  <Calendar.Label>Release date</Calendar.Label>\n  <Calendar.Content>\n    <Calendar.View view=\"day\">\n      <Calendar.ViewControl view=\"day\">\n        <Calendar.PrevTrigger />\n        <Calendar.ViewTrigger>\n          <Calendar.RangeText />\n        </Calendar.ViewTrigger>\n        <Calendar.NextTrigger />\n      </Calendar.ViewControl>\n      <Calendar.Table view=\"day\" />\n    </Calendar.View>\n  </Calendar.Content>\n</Calendar.Root>\n\nThe machine runs inline. selectionMode is single, multiple, or range, and value is a @internationalized/date DateValue[]. Label names the grid; Content and Table keep Zag's hidden and role=grid wiring. MonthSelect and YearSelect stay native. For the input-and-popup composition, use Date Picker.",
  },
  'date-picker': {
    title: 'Date Picker',
    description: 'A date input with a popup day, month, and year grid, on Zag.',
    docs: "import { DatePicker } from '@/components/ui/date-picker';\n\n<DatePicker.Root>\n  <DatePicker.Label>Release date</DatePicker.Label>\n  <DatePicker.Control>\n    <DatePicker.Input />\n    <DatePicker.ClearTrigger />\n    <DatePicker.Trigger />\n  </DatePicker.Control>\n  <DatePicker.Portal>\n    <DatePicker.Positioner>\n      <DatePicker.Content>\n        <DatePicker.View view=\"day\">\n          <DatePicker.ViewControl view=\"day\">\n            <DatePicker.PrevTrigger />\n            <DatePicker.ViewTrigger>\n              <DatePicker.RangeText />\n            </DatePicker.ViewTrigger>\n            <DatePicker.NextTrigger />\n          </DatePicker.ViewControl>\n          <DatePicker.Table view=\"day\" />\n        </DatePicker.View>\n      </DatePicker.Content>\n    </DatePicker.Positioner>\n  </DatePicker.Portal>\n</DatePicker.Root>\n\nsize is sm, md, or lg on Control, default md. Label names the input; a Field.Label does not reach it, so use DatePicker.Label or aria-labelledby. selectionMode=\"range\" pairs two Inputs at index 0 and 1, and PresetTrigger commits a named range. For the grid alone, use Calendar.",
  },
  'input-group': {
    title: 'Input Group',
    description: 'A field box holding an input with leading and trailing addons, in three sizes.',
    docs: "import { InputGroup } from '@/components/ui/input-group';\n\n<InputGroup.Root>\n  <InputGroup.Addon>@</InputGroup.Addon>\n  <InputGroup.Input placeholder=\"handle\" />\n  <InputGroup.Addon align=\"end\">.dev</InputGroup.Addon>\n</InputGroup.Root>\n\nRoot is a visual box with no role; a Field or Fieldset owns the semantics. The name is the inner input's own: a label, aria-label, or Field.Label. align on Addon positions it, not the DOM order.",
  },
  'native-select': {
    title: 'Native Select',
    description: 'A styled native select: the platform popup, the mobile picker, and native optgroup and multiple.',
    docs: "import { NativeSelect } from '@/components/ui/native-select';\n\n<label htmlFor=\"fruit\">Fruit</label>\n<NativeSelect.Root>\n  <NativeSelect.Select id=\"fruit\">\n    <option value=\"apple\">Apple</option>\n    <option value=\"pear\">Pear</option>\n  </NativeSelect.Select>\n</NativeSelect.Root>\n\nOptions and optgroups are children, not parts. Select is Field.Control rendered as a <select>, so inside a Field.Root the label, description, and invalid state reach it on their own. Reach for it when the OS-native popup is the point; Select stays the default when the option list wants Ultima's overlay styling.",
  },
  resizable: {
    title: 'Resizable',
    description: 'Panels with boundaries you drag or arrow, on Zag.',
    docs: "import { Resizable } from '@/components/ui/resizable';\n\n<Resizable.Root panels={[{ id: 'nav' }, { id: 'main' }]}>\n  <Resizable.Panel id=\"nav\">Navigation</Resizable.Panel>\n  <Resizable.Handle id=\"nav:main\" aria-label=\"Resize navigation\">\n    <Resizable.HandleIndicator />\n  </Resizable.Handle>\n  <Resizable.Panel id=\"main\">Content</Resizable.Panel>\n</Resizable.Root>\n\nEvery Handle needs a name: the type requires one of aria-label or aria-labelledby, the system's fourth enforced attribute. Sizing metadata (minSize, maxSize, collapsible, collapsedSize) lives on each panels entry, defaultSize sizes them at mount, and keyboardResizeBy sets the arrow step. The machine owns the panels' layout inline styles, including overflow: hidden. A strict CSP needs the nonce prop for the drag cursor <style>.",
  },
  'setup-vite': {
    title: 'Ultima setup for Vite',
    description:
      'components.json and ultima.vite.ts, the StyleX plugin preconfigured. Universal item: installs without Tailwind and without an existing components.json.',
    docs: 'Ultima on Vite, three steps:\n1. Add "paths": { "@/*": ["./src/*"] } to tsconfig.json and tsconfig.app.json. Without it the CLI writes files into a literal ./@/ directory.\n2. In vite.config.ts, import { ultimaStylex } from \'./ultima.vite.ts\' and put ultimaStylex() in plugins, before the React plugin.\n3. Wrap any global CSS reset in an @layer, or it beats every component style.\n\nThen: npx shadcn add @ultima/button',
    dependencies: ['@stylexjs/stylex'],
    devDependencies: ['@stylexjs/unplugin', 'unplugin'],
  },
  'setup-next': {
    title: 'Ultima setup for Next.js App Router',
    description:
      'components.json, babel.config.js, postcss.config.js, and the @stylex; stylesheet. Universal item: installs without Tailwind and without an existing components.json.',
    docs: "Ultima on Next.js, two steps:\n1. Import './ultima.css' from app/layout.tsx.\n2. Wrap any global CSS reset in an @layer. create-next-app ships `* { padding: 0 }`, which beats every component style.\n\nThen: npx shadcn add @ultima/button",
    dependencies: ['@stylexjs/stylex'],
    devDependencies: ['@stylexjs/babel-plugin', '@stylexjs/postcss-plugin'],
  },
  'tokens-css': {
    title: 'Ultima tokens as CSS',
    description: 'The generated token stylesheet, for a project that cannot run StyleX.',
    docs: "Import './ultima-tokens.css' once, from your root layout or entry stylesheet, then read the tokens with var(--ult-color-surface) and friends. Set data-theme=\"dark\" or \"light\" on <html> to pin a mode; without it the file follows the operating system.",
  },
  'ult-badge': {
    title: 'Badge element',
    description: 'Ultima Badge as a custom element, vendored for a host that cannot run React.',
    docs: '<script type="module" src="./ult-badge.js"></script>\n\n<ult-badge variant="subtle" tone="success">Passing</ult-badge>\n\nPair it with the tokens stylesheet the tokens-css item installed: <link rel="stylesheet" href="./ultima-tokens.css">\nAxes are attributes carrying the React prop values verbatim: variant and tone.\nThis file is a vendored artifact: a reinstall overwrites it and local edits are forfeit.',
    registryDependencies: ['https://ultima.systems/r/tokens-css.json'],
  },
  'ult-button': {
    title: 'Button element',
    description: 'Ultima Button as a custom element, vendored for a host that cannot run React.',
    docs: '<script type="module" src="./ult-button.js"></script>\n\n<ult-button variant="solid" size="md" tone="accent">Save</ult-button>\n\nPair it with the tokens stylesheet the tokens-css item installed: <link rel="stylesheet" href="./ultima-tokens.css">\nAxes are attributes carrying the React prop values verbatim: variant, size, tone, and disabled.\nThis file is a vendored artifact: a reinstall overwrites it and local edits are forfeit.',
    registryDependencies: ['https://ultima.systems/r/tokens-css.json'],
  },
  'ult-card': {
    title: 'Card element',
    description: 'Ultima Card as a custom element family, vendored for a host that cannot run React.',
    docs: '<script type="module" src="./ult-card.js"></script>\n\n<ult-card>\n  <ult-card-header>\n    <ult-card-title>Latency</ult-card-title>\n    <ult-card-description>p95 over the last hour</ult-card-description>\n  </ult-card-header>\n  <ult-card-body>Body</ult-card-body>\n  <ult-card-footer>Footer</ult-card-footer>\n</ult-card>\n\nPair it with the tokens stylesheet the tokens-css item installed: <link rel="stylesheet" href="./ultima-tokens.css">\nAxes are attributes carrying the React prop values verbatim; Card declares none.\nThis file is a vendored artifact: a reinstall overwrites it and local edits are forfeit.',
    registryDependencies: ['https://ultima.systems/r/tokens-css.json'],
  },
  'ult-code': {
    title: 'Code element',
    description: 'Ultima Code as a custom element, vendored for a host that cannot run React.',
    docs: '<script type="module" src="./ult-code.js"></script>\n\n<ult-code>npx shadcn add @ultima/button</ult-code>\n<ult-code variant="block">pnpm install\npnpm dev</ult-code>\n\nPair it with the tokens stylesheet the tokens-css item installed: <link rel="stylesheet" href="./ultima-tokens.css">\nAxes are attributes carrying the React prop values verbatim: variant.\nThis file is a vendored artifact: a reinstall overwrites it and local edits are forfeit.',
    registryDependencies: ['https://ultima.systems/r/tokens-css.json'],
  },
  'ult-meter': {
    title: 'Meter element',
    description: 'Ultima Meter as custom elements, vendored for a host that cannot run React.',
    docs: '<script type="module" src="./ult-meter.js"></script>\n\n<ult-meter value="72" tone="warning">\n  <ult-meter-label>Disk used</ult-meter-label>\n  <ult-meter-track>\n    <ult-meter-indicator></ult-meter-indicator>\n  </ult-meter-track>\n  <ult-meter-value></ult-meter-value>\n</ult-meter>\n\nPair it with the tokens stylesheet the tokens-css item installed: <link rel="stylesheet" href="./ultima-tokens.css">\nAxes are attributes carrying the React prop values verbatim: tone sits on ult-meter and a part-level tone on ult-meter-indicator or ult-meter-value wins; value, min, and max carry the reading.\nThis file is a vendored artifact: a reinstall overwrites it and local edits are forfeit.',
    registryDependencies: ['https://ultima.systems/r/tokens-css.json'],
  },
  'ult-stat': {
    title: 'Stat element',
    description: 'Ultima Stat as a family of custom elements, vendored for a host that cannot run React.',
    docs: '<script type="module" src="./ult-stat.js"></script>\n\n<ult-stat><ult-stat-label>Tokens</ult-stat-label><ult-stat-value>95</ult-stat-value></ult-stat>\n\nPair it with the tokens stylesheet the tokens-css item installed: <link rel="stylesheet" href="./ultima-tokens.css">\nThe parts are the family tags: ult-stat, ult-stat-label, and ult-stat-value. Stat declares no axes.\nThis file is a vendored artifact: a reinstall overwrites it and local edits are forfeit.',
    registryDependencies: ['https://ultima.systems/r/tokens-css.json'],
  },
  'ult-table': {
    title: 'Table element',
    description: 'Ultima Table as a family of custom elements, vendored for a host that cannot run React.',
    docs: '<script type="module" src="./ult-table.js"></script>\n\n<ult-table-scroll aria-labelledby="latency-caption">\n  <ult-table>\n    <ult-table-caption id="latency-caption">Latency by region</ult-table-caption>\n    <ult-table-head>\n      <ult-table-row><ult-table-head-cell>Region</ult-table-head-cell></ult-table-row>\n    </ult-table-head>\n    <ult-table-body>\n      <ult-table-row><ult-table-cell>us-east-1</ult-table-cell></ult-table-row>\n    </ult-table-body>\n  </ult-table>\n</ult-table-scroll>\n\nPair it with the tokens stylesheet the tokens-css item installed: <link rel="stylesheet" href="./ultima-tokens.css">\nOne element per part: ult-table, ult-table-scroll, ult-table-head, ult-table-body, ult-table-row, ult-table-head-cell, ult-table-sort-button, ult-table-cell, ult-table-caption. sort is an attribute on ult-table-head-cell carrying the React prop values verbatim.\nThis file is a vendored artifact: a reinstall overwrites it and local edits are forfeit.',
    registryDependencies: ['https://ultima.systems/r/tokens-css.json'],
  },
  'ult-tabs': {
    title: 'Tabs element',
    description: 'Ultima Tabs as a family of custom elements, vendored for a host that cannot run React.',
    docs: '<script type="module" src="./ult-tabs.js"></script>\n\n<ult-tabs value="tokens">\n  <ult-tabs-list aria-label="Docs sections">\n    <ult-tabs-tab value="tokens">Tokens</ult-tabs-tab>\n    <ult-tabs-tab value="themes">Themes</ult-tabs-tab>\n    <ult-tabs-indicator></ult-tabs-indicator>\n  </ult-tabs-list>\n  <ult-tabs-panel value="tokens">Anything.</ult-tabs-panel>\n  <ult-tabs-panel value="themes">More.</ult-tabs-panel>\n</ult-tabs>\n\nPair it with the tokens stylesheet the tokens-css item installed: <link rel="stylesheet" href="./ultima-tokens.css">\nThe parts are the family tags: ult-tabs, ult-tabs-list, ult-tabs-tab, ult-tabs-panel, and ult-tabs-indicator. Axes are attributes carrying the React prop values verbatim: variant on ult-tabs (underline or segmented), value and disabled on ult-tabs-tab, value on ult-tabs-panel, and orientation and value on ult-tabs. Selection defaults to manual activation; set activate-on-focus on ult-tabs-list to select on arrow.\nThis file is a vendored artifact: a reinstall overwrites it and local edits are forfeit.',
    registryDependencies: ['https://ultima.systems/r/tokens-css.json'],
  },
  'ult-tooltip': {
    title: 'Tooltip element',
    description: 'Ultima Tooltip as a family of custom elements, vendored for a host that cannot run React.',
    docs: '<script type="module" src="./ult-tooltip.js"></script>\n\n<ult-tooltip>\n  <ult-tooltip-trigger><button type="button" aria-label="Copied to clipboard">Copy</button></ult-tooltip-trigger>\n  <ult-tooltip-positioner>\n    <ult-tooltip-popup>Copied to clipboard<ult-tooltip-arrow></ult-tooltip-arrow></ult-tooltip-popup>\n  </ult-tooltip-positioner>\n</ult-tooltip>\n\nPair it with the tokens stylesheet the tokens-css item installed: <link rel="stylesheet" href="./ultima-tokens.css">\nOne element per part: ult-tooltip, ult-tooltip-trigger, ult-tooltip-positioner, ult-tooltip-popup, ult-tooltip-arrow. The trigger wraps your own focusable element and the aria-label on it must match the tooltip text, because the popup is role="tooltip" and never the name. The open attribute pins the tooltip open; Tooltip declares no axes.\nThis file is a vendored artifact: a reinstall overwrites it and local edits are forfeit.',
    registryDependencies: ['https://ultima.systems/r/tokens-css.json'],
  },
};
