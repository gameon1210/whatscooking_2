import React, { useState } from 'react';
import { Linking } from 'react-native';

import { warn } from '@/ui/feedback';
import { Eyebrow } from '@/ui/editorial';
import { Button, Card, H2, Input, Row, Screen, T } from '@/ui/kit';

const FEATURED = [
  { name: 'Poha', tag: 'Breakfast', source: 'Swasthi’s Recipes', url: 'https://www.indianhealthyrecipes.com/poha-recipe-kanda-batata-poha/' },
  { name: 'Rajma masala', tag: 'Punjabi home cooking', source: 'Dassana’s Veg Recipes', url: 'https://www.vegrecipesofindia.com/rajma-masala-recipe-restaurant-style/' },
  { name: 'Palak paneer', tag: 'Meat-free dinner', source: 'Dassana’s Veg Recipes', url: 'https://www.vegrecipesofindia.com/palak-paneer/' },
  { name: 'Teriyaki chicken', tag: 'Japanese home cooking', source: 'RecipeTin Japan', url: 'https://japan.recipetineats.com/teriyaki-chicken/' },
  { name: 'Kongnamulbap', tag: 'Korean soybean sprout rice', source: 'Maangchi', url: 'https://www.maangchi.com/recipe/kongnamulbap' },
];

const recipeSearch = (dish: string, site: string) => 'https://www.google.com/search?q=' + encodeURIComponent(`${dish} recipe site:${site}`);
const open = (url: string) => Linking.openURL(url).catch(() => warn('Couldn’t open this link. Check your connection and try again.'));

export default function Recipes() {
  const [dish, setDish] = useState('');
  const query = dish.trim();
  return (
    <Screen title="Good food to make at home" subtitle="Find a recipe for tonight or bring something new to the family table." edges={['bottom']}>
      <Card tone="alt">
        <Eyebrow>FIND A RECIPE</Eyebrow>
        <Input voice label="Dish name" placeholder="Try dal, pasta or dosa" value={dish} onChangeText={setDish} maxLength={120} />
        <Row wrap>
          <Button small label="Search Swasthi’s Recipes" blockedReason={!query && 'Say or type a dish first.'} onPress={() => open(recipeSearch(query, 'indianhealthyrecipes.com'))} />
          <Button small kind="secondary" label="Search RecipeTin Eats" blockedReason={!query && 'Say or type a dish first.'} onPress={() => open(recipeSearch(query, 'recipetineats.com'))} />
        </Row>
        <T small muted>Recipe links open in your browser. Check the ingredients against your family’s food rules.</T>
      </Card>
      <H2>Ideas for the week</H2>
      {FEATURED.map(({ name, tag, source, url }) => (
        <Card key={name}>
          <Eyebrow>{tag}</Eyebrow>
          <T bold>{name}</T>
          <Button small kind="ghost" label={`Read on ${source} ↗`} accessibilityLabel={`Read the ${name} recipe on ${source}`} onPress={() => open(url)} />
        </Card>
      ))}
    </Screen>
  );
}
