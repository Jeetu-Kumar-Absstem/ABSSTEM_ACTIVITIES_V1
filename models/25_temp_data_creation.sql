-- =============================================================================
-- TOURNAMENT TESTING DATA GENERATOR
-- =============================================================================
-- This script adds test users and registers them for all active tournaments.
-- RUN THIS IN THE SUPABASE SQL EDITOR.
-- =============================================================================

DO $$
DECLARE
    -- -------------------------------------------------------------------------
    -- CONFIGURATION: Edit these values to change the number of test users
    -- -------------------------------------------------------------------------
    num_test_players INTEGER := 20; -- <--- CHANGE THIS: Total players to create
    -- -------------------------------------------------------------------------

    v_emp_id TEXT;
    v_tournament_id BIGINT;
BEGIN
    RAISE NOTICE 'Starting test data generation for % players...', num_test_players;

    -- 1. Create Test Employees
    FOR i IN 1..num_test_players LOOP
        -- Create a unique employee code: TEST_EMP_1, TEST_EMP_2, etc.
        v_emp_id := 'TEST_EMP_' || i;

        -- Insert into employees table
        -- Using 'Test Player ' || i ensures the name is unique (e.g., Test Player 1, Test Player 2)
        INSERT INTO public.employees (employee_code, name, department)
        VALUES (v_emp_id, 'Test Player ' || i, 'Testing Dept')
        ON CONFLICT (employee_code) DO UPDATE
        SET name = 'Test Player ' || i;

    END LOOP;

    -- 2. Register these employees for ALL active tournaments
    FOR v_tournament_id IN
        SELECT id FROM public.tournaments WHERE status IN ('registration_open', 'live', 'active')
    LOOP
        RAISE NOTICE 'Registering players for tournament ID: %', v_tournament_id;

        INSERT INTO public.tournament_participants (tournament_id, employee_id, status, seed)
        SELECT
            v_tournament_id,
            employee_code,
            'registered',
            (row_number() OVER (ORDER BY employee_code))
        FROM public.employees
        WHERE employee_code LIKE 'TEST_EMP_%'
        ON CONFLICT DO NOTHING;

    END LOOP;

    RAISE NOTICE 'Success! % test players with unique names registered for all active tournaments.', num_test_players;
END $$;
