// Account Management Functions for WienOPNVApp

// Funktionen für Kontoeinstellungen
WienOPNVApp.prototype.handlePasswordChange = async function() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    
    // Validierung
    if (!currentPassword || !newPassword || !confirmPassword) {
        this.showNotification('Bitte füllen Sie alle Felder aus', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        this.showNotification('Die neuen Passwörter stimmen nicht überein', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        this.showNotification('Das neue Passwort muss mindestens 6 Zeichen lang sein', 'error');
        return;
    }
    
    try {
        // Passwort ändern (mit Supabase)
        const { error } = await window.supabaseClient.auth.updateUser({
            password: newPassword
        });
        
        if (error) {
            this.showNotification('Fehler: ' + error.message, 'error');
            return;
        }
        
        // Erfolgsmeldung und Modal schließen
        this.showNotification('Passwort erfolgreich geändert', 'success');
        this.closeModal('passwordChangeModal');
        
        // Passwort-Felder leeren
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmNewPassword').value = '';
    } catch (error) {
        this.showNotification('Fehler: ' + error.message, 'error');
    }
};

// Konto löschen
WienOPNVApp.prototype.deleteAccount = async function() {
    if (!confirm('Sind Sie sicher, dass Sie Ihr Konto löschen möchten? Dieser Vorgang kann nicht rückgängig gemacht werden.')) {
        return;
    }
    
    try {
        // Bei Supabase abmelden
        const { error } = await window.supabaseClient.auth.admin.deleteUser(
            this.auth.user.id
        );
        
        if (error) {
            this.showNotification('Fehler beim Löschen des Kontos: ' + error.message, 'error');
            return;
        }
        
        // Lokale Daten löschen und abmelden
        this.auth.logout();
        this.showNotification('Ihr Konto wurde erfolgreich gelöscht', 'success');
    } catch (error) {
        this.showNotification('Fehler: ' + error.message, 'error');
    }
};

// Profilbild aktualisieren
WienOPNVApp.prototype.updateProfilePicture = async function(file) {
    if (!file || !this.auth?.isLoggedIn) return;
    
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${this.auth.user.id}.${fileExt}`;
        const filePath = `profile_pictures/${fileName}`;
        
        // Bild zu Supabase Storage hochladen
        const { error: uploadError } = await window.supabaseClient
            .storage
            .from('avatars')
            .upload(filePath, file, {
                upsert: true
            });
            
        if (uploadError) {
            this.showNotification('Fehler beim Hochladen: ' + uploadError.message, 'error');
            return;
        }
        
        // Profilbild-URL in Profil aktualisieren
        const { data } = window.supabaseClient
            .storage
            .from('avatars')
            .getPublicUrl(filePath);
            
        await this.updateUserProfile({
            avatar_url: data.publicUrl
        });
        
        this.showNotification('Profilbild aktualisiert', 'success');
        this.updateAuthUI(); // UI aktualisieren um neues Bild anzuzeigen
    } catch (error) {
        this.showNotification('Fehler: ' + error.message, 'error');
    }
};

// User Profile updaten
WienOPNVApp.prototype.updateUserProfile = async function(data) {
    if (!this.auth?.isLoggedIn || !this.auth?.user) return false;
    
    try {
        const { error } = await window.supabaseClient
            .from('profiles')
            .upsert({
                id: this.auth.user.id,
                ...data,
                updated_at: new Date()
            });
            
        return { success: !error, error };
    } catch (error) {
        return { success: false, error };
    }
};

// Öffnet ein Authentifizierungs-Modal
WienOPNVApp.prototype.openAuthModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }
};

// Schließt ein Modal
WienOPNVApp.prototype.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
};
