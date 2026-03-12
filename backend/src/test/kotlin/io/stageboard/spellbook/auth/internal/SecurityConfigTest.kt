package io.stageboard.spellbook.auth.internal

import jakarta.servlet.http.Cookie
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.HttpHeaders
import org.springframework.security.oauth2.jose.jws.MacAlgorithm
import org.springframework.security.oauth2.jwt.JwsHeader
import org.springframework.security.oauth2.jwt.JwtClaimsSet
import org.springframework.security.oauth2.jwt.JwtEncoder
import org.springframework.security.oauth2.jwt.JwtEncoderParameters
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.header
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.test.web.servlet.setup.DefaultMockMvcBuilder
import org.springframework.test.web.servlet.setup.MockMvcBuilders
import org.springframework.web.context.WebApplicationContext
import java.time.Instant

@SpringBootTest
class SecurityConfigTest {
    @Autowired
    lateinit var context: WebApplicationContext

    @Autowired
    lateinit var jwtEncoder: JwtEncoder

    private lateinit var mockMvc: MockMvc

    @BeforeEach
    fun setUp() {
        mockMvc =
            MockMvcBuilders
                .webAppContextSetup(context)
                .apply<DefaultMockMvcBuilder>(springSecurity())
                .build()
    }

    @Test
    fun `protected endpoint without JWT cookie returns 401`() {
        mockMvc
            .perform(get("/api/workshops"))
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun `public auth endpoint without JWT cookie is not blocked by security`() {
        mockMvc
            .perform(get("/api/auth/me"))
            .andExpect(status().isNotFound) // no controller yet — but security passes it through
    }

    @Test
    fun `protected endpoint with valid JWT cookie is not rejected by security`() {
        val token = encodeTestJwt("user-id")

        mockMvc
            .perform(
                get("/api/workshops")
                    .cookie(Cookie("session", token)),
            ).andExpect(status().isNotFound) // no controller yet — security lets it through
    }

    @Test
    fun `CORS preflight returns allowed origin for configured origin`() {
        mockMvc
            .perform(
                options("/api/workshops")
                    .header(HttpHeaders.ORIGIN, "http://localhost:5173")
                    .header("Access-Control-Request-Method", "GET"),
            ).andExpect(status().isOk)
            .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:5173"))
    }

    @Test
    fun `CORS response includes allow-credentials true`() {
        mockMvc
            .perform(
                get("/api/auth/me")
                    .header(HttpHeaders.ORIGIN, "http://localhost:5173"),
            ).andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true"))
    }

    @Test
    fun `CORS does not allow unknown origin`() {
        mockMvc
            .perform(
                options("/api/workshops")
                    .header(HttpHeaders.ORIGIN, "http://evil.example.com")
                    .header("Access-Control-Request-Method", "GET"),
            ).andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN))
    }

    private fun encodeTestJwt(subject: String): String {
        val headers = JwsHeader.with(MacAlgorithm.HS256).build()
        val claims =
            JwtClaimsSet
                .builder()
                .subject(subject)
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(86400))
                .build()
        return jwtEncoder.encode(JwtEncoderParameters.from(headers, claims)).tokenValue
    }
}
