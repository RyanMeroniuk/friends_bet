import React, { createContext, useState, ReactNode, useContext } from 'react';

type GroupContextType = {
  groupId: string | null;
  setGroupId: (id: string) => void;
};

const GroupContext = createContext<GroupContextType>({
  groupId: null,
  setGroupId: () => {}
});

export function GroupProvider({ children }: { children: ReactNode }) {
  const [groupId, setGroupId] = useState<string | null>(null);
  return (
    <GroupContext.Provider value={{ groupId, setGroupId }}>
      {children}
    </GroupContext.Provider>
  );
}

export function useGroup() {
  return useContext(GroupContext);
}
