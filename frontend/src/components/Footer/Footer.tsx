import { Box, Container, Typography, IconButton, Link } from "@mui/material";
import { MailOutlined, GitHub, Language } from "@mui/icons-material";
import styles from "./Footer.module.css";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <Box component="footer" className={styles.footer}>
      <Container maxWidth="lg">
        <Box className={styles.content}>
          
          {/* ЛЕВАЯ КОЛОНКА: Выравнивание строго по левому краю */}
          <Box className={styles.infoColumn}>
            <Typography className={styles.footerText} sx={{ fontWeight: 600, color: "text.primary" }}>
              © {currentYear} Room & Assets. Все права защищены.
            </Typography>
            <Link href="#" className={`${styles.linkItem} ${styles.footerText}`}>   
              Пользовательское соглашение
            </Link>
            <Link href="#" className={`${styles.linkItem} ${styles.footerText}`}>
              Политика конфиденциальности
            </Link>
          </Box>
          
          {/* ПРАВАЯ КОЛОНКА */}
          <Box className={styles.contactsColumn}>
            <Link href="mailto:support@roomassets.ru" className={`${styles.linkItem} ${styles.footerText}`} sx={{ display: "flex", alignItems: "center", gap: 0.5, fontWeight: 500 }}>
              <MailOutlined sx={{ fontSize: 18 }} /> support@roomassets.ru
            </Link>
            
            <Box className={styles.socials}>
              <IconButton size="small" component="a" href="#" sx={{ color: "#6b6375", p: 0.5, '&:hover': { color: '#aa3bff' } }}>
                <GitHub sx={{ fontSize: 30 }} />
              </IconButton>
              <IconButton size="small" component="a" href="#" sx={{ color: "#6b6375", p: 0.5, '&:hover': { color: '#aa3bff' } }}>
                <Language sx={{ fontSize: 30 }} />
              </IconButton>
            </Box>
          </Box>

        </Box>
      </Container>
    </Box>
  );
}
