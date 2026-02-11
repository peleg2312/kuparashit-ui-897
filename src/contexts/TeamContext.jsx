/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import teams, { isScreenAllowed } from '../config/teams';
import { useAuth } from './AuthContext';
import screens, { getScreensByGroup } from '../config/screens';

const TeamContext = createContext(null);

function getFirstAllowedPath(team) {
    if (!team) return '/';
    const groups = getScreensByGroup(team.screens);
    const firstGroup = Object.values(groups)[0];
    return firstGroup?.screens?.[0]?.path || '/';
}

function getCurrentScreenId(pathname) {
    const matched = screens.find((screen) => pathname.startsWith(screen.path));
    return matched?.id;
}

export function TeamProvider({ children }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const userTeams = useMemo(() => {
        if (!user) return [];
        return user.teams.map((teamId) => teams[teamId]).filter(Boolean);
    }, [user]);

    const [currentTeamId, setCurrentTeamId] = useState(null);

    const currentTeam = useMemo(() => {
        if (!userTeams.length) return null;
        const preferred = userTeams.find((team) => team.id === currentTeamId);
        return preferred || userTeams[0];
    }, [userTeams, currentTeamId]);

    const switchTeam = (teamId) => {
        const team = teams[teamId];
        if (!team) return;

        setCurrentTeamId(team.id);
        const screenId = getCurrentScreenId(location.pathname);
        const canStay = !screenId || isScreenAllowed(team.id, screenId);
        if (!canStay) {
            navigate(getFirstAllowedPath(team), { replace: true });
        }
    };

    const isAllowed = (screenId) => {
        if (!currentTeam) return false;
        return isScreenAllowed(currentTeam.id, screenId);
    };

    return (
        <TeamContext.Provider value={{ currentTeam, userTeams, switchTeam, isAllowed }}>
            {children}
        </TeamContext.Provider>
    );
}

export function useTeam() {
    const ctx = useContext(TeamContext);
    if (!ctx) throw new Error('useTeam must be used within TeamProvider');
    return ctx;
}
