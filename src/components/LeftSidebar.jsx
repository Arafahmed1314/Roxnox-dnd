import React from "react";
import SidebarItem from "./SidebarItem";

export default function LeftSidebar() {
  return (
    <aside className="hidden md:block w-[220px] bg-[#dedede] p-4 border-r border-gray-300">
      <div className="font-bold bg-[#d4d4d4] px-3 py-2 text-center rounded mb-4">
        Sidebar
      </div>
      <div className="flex flex-col">
        <SidebarItem id="row" label="row" type="row" />
        <SidebarItem id="column" label="column" type="column" />
        <SidebarItem id="demo" label="demo item" type="component" />
        <SidebarItem id="image" label="image" type="component" />
        <SidebarItem id="input" label="input" type="component" />
      </div>
    </aside>
  );
}
