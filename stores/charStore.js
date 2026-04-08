import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { persist, createJSONStorage } from "zustand/middleware";

export const useCharacterStore = create(
  persist(
    (set, get) => ({
      // --- BANCO DE DADOS EM MEMÓRIA ---
      characters: [
        {
          id: "1",
          name: "Conan, o Bárbaro",
          system: "D&D 3.5",
          level: 1,
          baseStats: { str: 18, dex: 14, con: 16, int: 8, wis: 10, cha: 12 },
          classes: [{ slug: "barbarian", level: 1 }],
        },
        {
          id: "2",
          name: "Conan, o Bárbaro",
          system: "D&D 3.5",
          level: 1,
          baseStats: { str: 18, dex: 14, con: 16, int: 8, wis: 10, cha: 12 },
          classes: [{ slug: "barbarian", level: 1 }],
        },
        {
          id: "3",
          name: "Conan, o Bárbaro",
          system: "D&D 3.5",
          level: 1,
          baseStats: { str: 18, dex: 14, con: 16, int: 8, wis: 10, cha: 12 },
          classes: [{ slug: "barbarian", level: 1 }],
        },
      ],
      activeCharacterId: null,

      // --- AÇÕES GLOBAIS ---
      setActiveCharacter: (id) => set({ activeCharacterId: id }),

      createCharacter: (newCharacter) =>
        set((state) => ({
          characters: [...state.characters, newCharacter],
        })),

      // Deleta um personagem da lista baseado no ID
      deleteCharacter: (id) =>
        set((state) => ({
          characters: state.characters.filter((char) => char.id !== id),
          // Se o personagem deletado era o ativo, limpamos o ID ativo
          activeCharacterId:
            state.activeCharacterId === id ? null : state.activeCharacterId,
        })),

      // Alterna o status de "fixado" (isPinned) de um personagem
      togglePinCharacter: (id) =>
        set((state) => ({
          characters: state.characters.map((char) =>
            char.id === id ? { ...char, isPinned: !char.isPinned } : char,
          ),
        })),

      // Helper para facilitar pegar a ficha atual
      getActiveCharacter: () => {
        const { characters, activeCharacterId } = get();
        return characters.find((c) => c.id === activeCharacterId);
      },

      // --- AÇÕES ESPECÍFICAS DA FICHA ---
      // Atualiza qualquer campo do personagem ativo
      updateActiveCharacter: (updates) =>
        set((state) => ({
          characters: state.characters.map((char) =>
            char.id === state.activeCharacterId
              ? { ...char, ...updates }
              : char,
          ),
        })),

      // Exemplo prático de uso das ações:
      setBaseStat: (stat, value) => {
        const char = get().getActiveCharacter();
        if (!char) return;
        get().updateActiveCharacter({
          baseStats: { ...char.baseStats, [stat]: parseInt(value) || 0 },
        });
      },

      // Equipar itens agora atualiza o personagem ativo!
      equipItem: (item, slot) => {
        const updates = {};
        if (slot === "main") updates.mainHand = item;
        if (slot === "off") updates.offHand = item;
        if (slot === "armor") updates.selectedArmor = item;
        get().updateActiveCharacter(updates);
      },
    }),
    {
      name: "rpg-manager-storage", // O nome do "arquivo" que será salvo no celular
      storage: createJSONStorage(() => AsyncStorage), // Diz ao Zustand para usar o AsyncStorage
    },
  ),
);
