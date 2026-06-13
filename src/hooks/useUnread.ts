import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUnreadCount } from "@/lib/inbox";

// Ungelesene Nachrichten für die Navbar-Glocke. Pollt alle 60s.
export function useUnread() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }
    let active = true;
    const load = () => getUnreadCount(user.id).then((c) => active && setCount(c));
    load();
    const id = setInterval(load, 60000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [user]);

  return count;
}
