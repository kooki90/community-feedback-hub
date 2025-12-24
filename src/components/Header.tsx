import { useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Menu, X, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Header() {
  const { user, profile, signOut, isAdmin } = useAuthContext();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
            <span className="text-primary-foreground font-bold text-sm">P</span>
          </div>
          <span className="text-lg font-semibold">Patchly</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <Link to="/submit">
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  Submit
                </Button>
              </Link>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">
                        {profile?.username?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{profile?.username}</span>
                    {isAdmin && <span className="text-xs text-primary">(Admin)</span>}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link to="/auth">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link to="/auth?mode=signup">
                <Button size="sm">Sign Up</Button>
              </Link>
            </>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 rounded-md hover:bg-secondary"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="border-t border-border p-4 md:hidden bg-card">
          <nav className="flex flex-col gap-2">
            {user ? (
              <>
                <div className="flex items-center gap-2 p-2 rounded-md bg-secondary">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      {profile?.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{profile?.username}</span>
                </div>
                <Link to="/submit" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full gap-1.5">
                    <Plus className="h-4 w-4" />
                    Submit Report
                  </Button>
                </Link>
                <Button variant="ghost" className="w-full justify-start" onClick={() => { signOut(); setMobileMenuOpen(false); }}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full">Sign In</Button>
                </Link>
                <Link to="/auth?mode=signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full">Sign Up</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
