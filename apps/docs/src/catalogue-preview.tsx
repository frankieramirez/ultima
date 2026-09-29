import { InfoIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Accordion, Alert, AspectRatio, Avatar, Badge, Breadcrumb, Button, Card } from '@ultima/ui';
import type { ComponentType } from 'react';

import ButtonGroupPreview from './demos/button-group/basic';
import CalendarPreview from './demos/calendar/basic';
import CardPreview from './demos/card/item';
import CheckboxPreview from './demos/checkbox/field-group';
import CodePreview from './demos/code/inline';
import CollapsiblePreview from './demos/collapsible/basic';
import ColorFieldPreview from './demos/color-field/basic';
import ComboboxPreview from './demos/combobox/canonical';
import CommandPreview from './demos/command/inline';
import ContextMenuPreview from './demos/context-menu/actions';
import DatePickerPreview from './demos/date-picker/basic';
import DialogPreview from './demos/dialog/basic';
import DrawerPreview from './demos/drawer/basic';
import DropdownMenuPreview from './demos/dropdown-menu/features';
import EmptyPreview from './demos/empty/no-reports';
import FieldPreview from './demos/field/basic';
import FieldsetPreview from './demos/fieldset/basic';
import HoverCardPreview from './demos/hover-card/prose';
import InputPreview from './demos/input/labels';
import InputGroupPreview from './demos/input-group/addons';
import InputOtpPreview from './demos/input-otp/basic';
import MenubarPreview from './demos/menubar/document';
import MeterPreview from './demos/meter/tones';
import NativeSelectPreview from './demos/native-select/field';
import NavigationMenuPreview from './demos/navigation-menu/glyph';
import PaginationPreview from './demos/pagination/links';
import PopoverPreview from './demos/popover/basic';
import ProgressPreview from './demos/progress/indeterminate';
import RadioGroupPreview from './demos/radio-group/basic';
import ResizablePreview from './demos/resizable/basic';
import ScrollAreaPreview from './demos/scroll-area/basic';
import SelectPreview from './demos/select/groups';
import SeparatorPreview from './demos/separator/basic';
import SidebarPreview from './demos/sidebar/collapse';
import SkeletonPreview from './demos/skeleton/card';
import SliderPreview from './demos/slider/in-field';
import SpinnerPreview from './demos/spinner/inline';
import StatPreview from './demos/stat/summary';
import SwitchPreview from './demos/switch/labels';
import TablePreview from './demos/table/chart';
import TabsPreview from './demos/tabs/variants';
import TextareaPreview from './demos/textarea/field-states';
import ToastPreview from './demos/toast/stacked';
import TogglePreview from './demos/toggle/basic';
import ToggleGroupPreview from './demos/toggle-group/basic';
import TooltipPreview from './demos/tooltip/button';

const previews = new Map<string, ComponentType>([
  ['button-group', ButtonGroupPreview],
  ['calendar', CalendarPreview],
  ['card', CardPreview],
  ['checkbox', CheckboxPreview],
  ['code', CodePreview],
  ['collapsible', CollapsiblePreview],
  ['color-field', ColorFieldPreview],
  ['combobox', ComboboxPreview],
  ['command', CommandPreview],
  ['context-menu', ContextMenuPreview],
  ['date-picker', DatePickerPreview],
  ['dialog', DialogPreview],
  ['drawer', DrawerPreview],
  ['dropdown-menu', DropdownMenuPreview],
  ['empty', EmptyPreview],
  ['field', FieldPreview],
  ['fieldset', FieldsetPreview],
  ['hover-card', HoverCardPreview],
  ['input', InputPreview],
  ['input-group', InputGroupPreview],
  ['input-otp', InputOtpPreview],
  ['menubar', MenubarPreview],
  ['meter', MeterPreview],
  ['native-select', NativeSelectPreview],
  ['navigation-menu', NavigationMenuPreview],
  ['pagination', PaginationPreview],
  ['popover', PopoverPreview],
  ['progress', ProgressPreview],
  ['radio-group', RadioGroupPreview],
  ['resizable', ResizablePreview],
  ['scroll-area', ScrollAreaPreview],
  ['select', SelectPreview],
  ['separator', SeparatorPreview],
  ['sidebar', SidebarPreview],
  ['skeleton', SkeletonPreview],
  ['slider', SliderPreview],
  ['spinner', SpinnerPreview],
  ['stat', StatPreview],
  ['switch', SwitchPreview],
  ['table', TablePreview],
  ['tabs', TabsPreview],
  ['textarea', TextareaPreview],
  ['toast', ToastPreview],
  ['toggle', TogglePreview],
  ['toggle-group', ToggleGroupPreview],
  ['tooltip', TooltipPreview],
]);

const sampleStyles = stylex.create({
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: space['--ult-space-4'],
    flexWrap: 'wrap',
  },
  full: { inlineSize: '100%' },
  ratio: { inlineSize: '7rem' },
  media: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
    blockSize: '100%',
  },
  dialog: { padding: space['--ult-space-5'], inlineSize: '100%' },
});

function compactSample(item: string) {
  switch (item) {
    case 'accordion':
      return (
        <div {...stylex.props(sampleStyles.full)}>
          <Accordion.Root>
            <Accordion.Item value="details">
              <Accordion.Header>
                <Accordion.Trigger>Details</Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel>Supporting content.</Accordion.Panel>
            </Accordion.Item>
          </Accordion.Root>
        </div>
      );
    case 'alert':
      return (
        <Alert.Root>
          <Alert.Icon>
            <InfoIcon />
          </Alert.Icon>
          <Alert.Description>A useful heads-up.</Alert.Description>
        </Alert.Root>
      );
    case 'alert-dialog':
      return (
        <Card.Root style={sampleStyles.dialog}>
          <Card.Title>Are you sure?</Card.Title>
          <div {...stylex.props(sampleStyles.row)}>
            <Button size="sm" variant="ghost">
              Cancel
            </Button>
            <Button size="sm">Continue</Button>
          </div>
        </Card.Root>
      );
    case 'aspect-ratio':
      return (
        <AspectRatio ratio={16 / 9} style={sampleStyles.ratio}>
          <Card.Root style={sampleStyles.media}>16:9</Card.Root>
        </AspectRatio>
      );
    case 'avatar':
      return (
        <div {...stylex.props(sampleStyles.row)}>
          {['AM', 'JL', 'RK'].map((label) => (
            <Avatar.Root key={label}>
              <Avatar.Fallback>{label}</Avatar.Fallback>
            </Avatar.Root>
          ))}
        </div>
      );
    case 'badge':
      return (
        <div {...stylex.props(sampleStyles.row)}>
          <Badge>New</Badge>
          <Badge tone="success">Ready</Badge>
        </div>
      );
    case 'breadcrumb':
      return (
        <Breadcrumb.Root>
          <Breadcrumb.List>
            <Breadcrumb.Item>
              <Breadcrumb.Link href="/install">Docs</Breadcrumb.Link>
            </Breadcrumb.Item>
            <Breadcrumb.Separator />
            <Breadcrumb.Item>
              <Breadcrumb.Link active href="/components">
                Components
              </Breadcrumb.Link>
            </Breadcrumb.Item>
          </Breadcrumb.List>
        </Breadcrumb.Root>
      );
    case 'button':
      return (
        <div {...stylex.props(sampleStyles.row)}>
          <Button>Solid</Button>
          <Button variant="outline">Outline</Button>
        </div>
      );
    default:
      return null;
  }
}


const styles = stylex.create({
  sample: {
    borderRadius: 0,
    borderWidth: 0,
    display: 'grid',
    placeItems: 'center',
    blockSize: '6.5rem',
    padding: space['--ult-space-5'],
    overflow: 'hidden',
    minInlineSize: 0,
  },
  contents: { display: 'flex', justifyContent: 'center', inlineSize: '100%', maxInlineSize: '100%', pointerEvents: 'none', minInlineSize: 0 },
});

export function CataloguePreview({ item }: { item: string }) {
  const Preview = previews.get(item);
  return (
    <Card.Root aria-hidden inert data-component-preview style={styles.sample}>
      <div {...stylex.props(styles.contents)}>
        {compactSample(item) ?? (Preview && <Preview />)}

      </div>
    </Card.Root>
  );
}
