package com.ryanmeroniuk.friends_bet.filter;

import com.ryanmeroniuk.friends_bet.service.UserDetailsService;
import com.ryanmeroniuk.friends_bet.util.JwtUtil;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.impl.DefaultClaims;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private UserDetailsService userDetailsService;

    private JwtAuthenticationFilter filter;

    @BeforeEach
    void setUp() {
        filter = new JwtAuthenticationFilter(jwtUtil, userDetailsService);
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    // ── shouldNotFilter ──

    @Test
    void shouldNotFilter_publicPaths() {
        assertThat(filter.shouldNotFilter(request("/api/users/register"))).isTrue();
        assertThat(filter.shouldNotFilter(request("/api/users/login"))).isTrue();
        assertThat(filter.shouldNotFilter(request("/api/users/refresh"))).isTrue();
        assertThat(filter.shouldNotFilter(request("/api/users/logout"))).isTrue();
        assertThat(filter.shouldNotFilter(request("/h2-console/anything"))).isTrue();
        assertThat(filter.shouldNotFilter(request("/h2-console"))).isTrue();
    }

    @Test
    void shouldFilter_protectedPaths() {
        assertThat(filter.shouldNotFilter(request("/api/groups"))).isFalse();
        assertThat(filter.shouldNotFilter(request("/api/bets/123/accept"))).isFalse();
        assertThat(filter.shouldNotFilter(request("/api/users/me"))).isFalse();
        assertThat(filter.shouldNotFilter(request("/api/admin/refresh"))).isFalse();
    }

    // ── doFilterInternal ──

    @Test
    void doFilter_validAccessToken_setsAuthentication() throws Exception {
        Claims claims = new DefaultClaims();
        claims.setSubject("testuser");
        claims.put("token_type", "access");

        UserDetails userDetails = User.builder()
                .username("testuser").password("pw").roles("USER").build();

        when(jwtUtil.parseAndValidate("valid-token")).thenReturn(claims);
        when(userDetailsService.loadUserByUsername("testuser")).thenReturn(userDetails);

        MockHttpServletRequest req = request("/api/groups");
        req.addHeader("Authorization", "Bearer valid-token");
        MockHttpServletResponse res = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilterInternal(req, res, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication().getName()).isEqualTo("testuser");
        assertThat(chain.getRequest()).isNotNull(); // chain.doFilter was called
    }

    @Test
    void doFilter_refreshToken_doesNotAuthenticate() throws Exception {
        Claims claims = new DefaultClaims();
        claims.setSubject("testuser");
        claims.put("token_type", "refresh");

        when(jwtUtil.parseAndValidate("refresh-token")).thenReturn(claims);

        MockHttpServletRequest req = request("/api/groups");
        req.addHeader("Authorization", "Bearer refresh-token");
        MockHttpServletResponse res = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilterInternal(req, res, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        assertThat(chain.getRequest()).isNotNull();
    }

    @Test
    void doFilter_noAuthHeader_passesThrough() throws Exception {
        MockHttpServletRequest req = request("/api/groups");
        MockHttpServletResponse res = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilterInternal(req, res, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        assertThat(chain.getRequest()).isNotNull();
    }

    @Test
    void doFilter_invalidToken_clearsContext() throws Exception {
        when(jwtUtil.parseAndValidate("bad-token")).thenThrow(new JwtException("invalid"));

        MockHttpServletRequest req = request("/api/groups");
        req.addHeader("Authorization", "Bearer bad-token");
        MockHttpServletResponse res = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilterInternal(req, res, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        assertThat(chain.getRequest()).isNotNull();
    }

    // ── Helpers ──

    private static MockHttpServletRequest request(String uri) {
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setRequestURI(uri);
        return req;
    }
}
