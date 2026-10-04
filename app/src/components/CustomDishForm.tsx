import React, { useState } from 'react';
import { View } from 'react-native';

import { ALLERGEN_LABEL, Allergen } from '@/domain/allergens';
import { CustomMeta, guessDiet } from '@/domain/catalog';
import { DIET_LABEL } from '@/domain/family';
import type { Diet } from '@/domain/types';
import { Button, Card, Chip, Row, Segmented, T, Toggle } from '@/ui/kit';

const COMMON: Allergen[] = ['milk', 'wheat', 'peanut', 'nuts', 'egg', 'soy', 'fish', 'sesame', 'coconut'];

/**
 * A new dish is only as safe as what we know about it (D03). Before it can be
 * planned for anyone with diet or allergy rules, the planner confirms its diet,
 * what it contains, and whether it has onion or garlic.
 */
export function CustomDishForm({ name, initial, onConfirm, onCancel }: { name: string; initial?: Partial<CustomMeta>; onConfirm: (m: CustomMeta) => void; onCancel?: () => void }) {
  const [diet, setDiet] = useState<Diet>(initial?.diet ?? guessDiet(name));
  const [allergens, setAllergens] = useState<string[]>(initial?.allergens ?? []);
  const [onionGarlic, setOnionGarlic] = useState(initial?.onionGarlic ?? true);
  const [spice, setSpice] = useState<string>(String(initial?.spice ?? 1));
  return (
    <Card tone="warn">
      <T bold>About “{name}”</T>
      <T small muted>
        Tell us once, so it is never offered to someone who can’t eat it.
      </T>
      <T small muted bold>
        It is
      </T>
      <Segmented<Diet> value={diet} onChange={setDiet} options={(['vegan', 'veg', 'egg', 'nonveg'] as Diet[]).map((d) => ({ value: d, label: DIET_LABEL[d] }))} />
      <T small muted bold>
        It contains (tap all that apply)
      </T>
      <Row wrap>
        {COMMON.map((a) => (
          <Chip key={a} label={ALLERGEN_LABEL[a]} selected={allergens.includes(a)} onPress={() => setAllergens(allergens.includes(a) ? allergens.filter((x) => x !== a) : [...allergens, a])} />
        ))}
      </Row>
      <Toggle label="Has onion or garlic" value={onionGarlic} onChange={setOnionGarlic} />
      <T small muted bold>
        Spice
      </T>
      <Segmented<string>
        value={spice}
        onChange={setSpice}
        options={[
          { value: '0', label: 'None' },
          { value: '1', label: 'Mild' },
          { value: '2', label: 'Medium' },
          { value: '3', label: 'Hot' },
        ]}
      />
      <View style={{ gap: 8 }}>
        <Button label="Save dish" onPress={() => onConfirm({ diet, allergens, onionGarlic, spice: Number(spice) as CustomMeta['spice'] })} />
        {onCancel ? <Button kind="ghost" label="Cancel" onPress={onCancel} /> : null}
      </View>
    </Card>
  );
}
