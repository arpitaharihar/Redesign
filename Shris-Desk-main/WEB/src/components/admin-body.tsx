"use client";

import { useEffect } from "react";

export function AdminBody() {
  useEffect(() => {
    const original = document.body.className;
    document.body.className = "g-sidenav-show bg-gray-200";
    const head = document.head;
    const links = [
      {
        id: "admin-font-roboto",
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css?family=Roboto:300,400,500,700,900|Roboto+Slab:400,700",
      },
      {
        id: "admin-font-icons",
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/icon?family=Material+Icons+Round",
      },
      {
        id: "admin-nucleo-icons",
        rel: "stylesheet",
        href: "/admin/css/nucleo-icons.css",
      },
      {
        id: "admin-nucleo-svg",
        rel: "stylesheet",
        href: "/admin/css/nucleo-svg.css",
      },
      {
        id: "admin-material-dashboard",
        rel: "stylesheet",
        href: "/admin/css/material-dashboard.css",
      },
      {
        id: "admin-ui",
        rel: "stylesheet",
        href: "/admin/admin-ui.css",
      },
    ];

    links.forEach((link) => {
      if (!document.getElementById(link.id)) {
        const el = document.createElement("link");
        el.id = link.id;
        el.rel = link.rel;
        el.href = link.href;
        head.appendChild(el);
      }
    });

    return () => {
      document.body.className = original;
    };
  }, []);

  return null;
}
