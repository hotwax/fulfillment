import { shallowRef } from 'vue';
import { loadRemote } from '@module-federation/runtime';

const useDynamicImport = ({ scope, module }: any) => {
  if (!module || !scope) return;

  const loadComponent = async () => {
    try {
      const { default: Component } = await loadRemote(`${scope}/${module}`) as any;
      return shallowRef(Component)
    } catch (error) {
      console.error(`Error loading remote module ${scope}/${module}:`, error);
    }
  };

  return loadComponent();
}

export const moduleFederationUtil = {
  useDynamicImport
}
