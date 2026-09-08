package com.ryanmeroniuk.friends_bet.config;

import com.ryanmeroniuk.friends_bet.filter.JwtAuthenticationFilter;
import com.ryanmeroniuk.friends_bet.filter.AdminSecretFilter;
import com.ryanmeroniuk.friends_bet.filter.RateLimitFilter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;
import java.util.stream.Stream;

@Configuration
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final AdminSecretFilter adminSecretFilter;
    private final RateLimitFilter rateLimitFilter;
    private final String corsAllowedOrigins;
    private final boolean h2ConsoleEnabled;
    private final String[] activeProfiles;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter,
                          AdminSecretFilter adminSecretFilter,
                          RateLimitFilter rateLimitFilter,
                          @Value("${app.cors.allowed-origins:}") String corsAllowedOrigins,
                          @Value("${spring.h2.console.enabled:false}") boolean h2ConsoleEnabled,
                          org.springframework.core.env.Environment environment) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.adminSecretFilter = adminSecretFilter;
        this.rateLimitFilter = rateLimitFilter;
        this.corsAllowedOrigins = corsAllowedOrigins;
        this.h2ConsoleEnabled = h2ConsoleEnabled;
        this.activeProfiles = environment.getActiveProfiles();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .headers(headers -> {
                    if (h2ConsoleEnabled) {
                        headers.frameOptions(frame -> frame.disable());
                    } else {
                        headers.frameOptions(frame -> frame.sameOrigin());
                    }
                })
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // Make unauthenticated => 401, access denied => 403
                .exceptionHandling(h -> h
                        .authenticationEntryPoint((req, res, ex) -> res.sendError(HttpServletResponse.SC_UNAUTHORIZED))
                        .accessDeniedHandler((req, res, ex) -> res.sendError(HttpServletResponse.SC_FORBIDDEN))
                )

                .authorizeHttpRequests(auth -> {
                    // Auth endpoints + health are public
                    auth.requestMatchers(
                            "/api/users/register",
                            "/api/users/login",
                            "/api/users/refresh",
                            "/api/users/logout",
                            "/ping",
                            "/actuator/health",
                            "/actuator/info"
                    ).permitAll();

                    // H2 console only permitted when explicitly enabled (dev profile)
                    if (h2ConsoleEnabled) {
                        auth.requestMatchers("/h2-console/**").permitAll();
                    }

                    // Public read for sports/games browsing
                    auth.requestMatchers(HttpMethod.GET, "/api/sports/**").permitAll();
                    auth.requestMatchers(HttpMethod.GET, "/api/games/**").permitAll();

                    // Admin endpoints require auth (+ secret enforced by AdminSecretFilter)
                    auth.requestMatchers("/api/admin/**").authenticated();

                    // Everything else under /api/** requires a valid access token
                    auth.requestMatchers("/api/**").authenticated();
                })
                .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(adminSecretFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(parseCorsOrigins());
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    private List<String> parseCorsOrigins() {
        List<String> origins = Stream.of(corsAllowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .distinct()
                .toList();
        if (origins.isEmpty()) {
            boolean isDev = java.util.Arrays.stream(activeProfiles)
                    .anyMatch(p -> p.equals("dev") || p.equals("test") || p.equals("local"));
            if (!isDev) {
                throw new IllegalStateException(
                        "app.cors.allowed-origins must be set in non-dev profiles");
            }
        }
        return origins;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
