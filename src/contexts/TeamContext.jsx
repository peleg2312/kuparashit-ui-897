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
    const { user, permissions } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const permissionTeam = useMemo(() => {
        const permissionSet = new Set((permissions || []).map((item) => String(item)));
        const allowsAll = permissionSet.has('*') || permissionSet.has('all');
        const allowedScreens = allowsAll
            ? screens.map((screen) => screen.id)
            : screens
                .map((screen) => screen.id)
                .filter((screenId) => permissionSet.has(screenId));

        if (!allowedScreens.length) return null;

        return {
            id: 'PERMISSIONS',
            name: 'Permissions',
            description: 'Permission based workspace',
            screens: allowedScreens,
            color: '#1f78ff',
            image: null,
        };
    }, [permissions]);

    const userTeams = useMemo(() => {
        if (!user) return [];
        const mappedTeams = user.teams.map((teamId) => teams[teamId]).filter(Boolean);
        if (mappedTeams.length) return mappedTeams;
        return permissionTeam ? [permissionTeam] : [];
    }, [user, permissionTeam]);

    const [currentTeamId, setCurrentTeamId] = useState(null);

    const currentTeam = useMemo(() => {
        if (!userTeams.length) return null;
        const preferred = userTeams.find((team) => team.id === currentTeamId);
        return preferred || userTeams[0];
    }, [userTeams, currentTeamId]);

    const switchTeam = (teamId) => {
        const team = userTeams.find((item) => item.id === teamId);
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
        if (currentTeam.id === 'PERMISSIONS') {
            if (currentTeam.screens.includes('*')) return true;
            return currentTeam.screens.includes(screenId);
        }
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
