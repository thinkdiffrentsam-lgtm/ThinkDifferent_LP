import React, { useState, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import Resizer from 'react-image-file-resizer';
import { User, Lock, Upload, Save, Bell } from 'lucide-react';

const ProfileSettings = () => {
  const { user, setUser } = useContext(AuthContext);
  const fileInputRef = useRef(null);

  // Profile Form State
  const [name, setName] = useState(user?.name || '');
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || '');
  const [notificationsEnabled, setNotificationsEnabled] = useState(user?.preferences?.notificationsEnabled ?? true);
  const [uploading, setUploading] = useState(false);
  const [profileStatus, setProfileStatus] = useState({ type: '', message: '' });

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState({ type: '', message: '' });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);

    try {
      Resizer.imageFileResizer(
        file,
        400, // maxWidth
        400, // maxHeight
        'JPEG',
        90, // quality
        0, // rotation
        async (resizedFile) => {
          try {
            const formData = new FormData();
            formData.append('file', resizedFile);
            
            const res = await api.post('/api/upload', formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            });
            setProfilePicture(res.data.url);
            setProfileStatus({ type: 'success', message: 'Image uploaded successfully. Click save to update profile.' });
          } catch (error) {
            console.error(error);
            setProfileStatus({ type: 'error', message: 'Failed to upload image.' });
          } finally {
            setUploading(false);
          }
        },
        'file' // output type
      );
    } catch (err) {
      console.error(err);
      setProfileStatus({ type: 'error', message: 'Failed to resize image.' });
      setUploading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileStatus({ type: '', message: '' });

    try {
      const res = await api.put('/api/auth/profile', {
        name,
        profilePicture,
        preferences: { notificationsEnabled }
      });
      
      setUser(res.data);
      setProfileStatus({ type: 'success', message: 'Profile updated successfully!' });
    } catch (error) {
      console.error(error);
      setProfileStatus({ type: 'error', message: 'Failed to update profile.' });
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordStatus({ type: '', message: '' });

    if (newPassword !== confirmPassword) {
      return setPasswordStatus({ type: 'error', message: 'New passwords do not match.' });
    }

    try {
      await api.put('/api/auth/password', {
        currentPassword,
        newPassword
      });
      
      setPasswordStatus({ type: 'success', message: 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error(error);
      setPasswordStatus({ type: 'error', message: error.response?.data?.message || 'Failed to update password.' });
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 ">Profile Settings</h1>
        <p className="text-slate-500  mt-1">Manage your personal information and preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Profile Details Section */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white  border border-slate-200  rounded-2xl shadow-sm p-6 transition-colors duration-200">
            <h2 className="text-lg font-semibold text-slate-800  flex items-center mb-6">
              <User className="w-5 h-5 mr-2 text-indigo-500" />
              Personal Information
            </h2>

            {profileStatus.message && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${profileStatus.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>
                {profileStatus.message}
              </div>
            )}

            <form onSubmit={handleProfileSubmit} className="space-y-5">
              {/* Profile Picture */}
              <div>
                <label className="block text-sm font-medium text-slate-700  mb-3">Profile Picture</label>
                <div className="flex items-center space-x-6">
                  {profilePicture ? (
                    <img src={profilePicture} alt="Profile" className="w-20 h-20 rounded-full object-cover border border-slate-200 " />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-indigo-50  flex items-center justify-center text-indigo-600  text-2xl font-bold border border-indigo-100/50 ">
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  
                  <div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current.click()}
                      disabled={uploading}
                      className="flex items-center px-4 py-2 bg-white  border border-slate-300  rounded-lg text-sm font-medium text-slate-700  hover:bg-slate-50  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? 'Uploading...' : 'Change Picture'}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700  mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-slate-300  rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-white  text-slate-900 "
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700  mb-1">Email</label>
                <input
                  type="email"
                  value={user?.email}
                  disabled
                  className="w-full px-4 py-2 border border-slate-300  rounded-lg bg-slate-100  text-slate-500  cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-slate-500 ">Email cannot be changed.</p>
              </div>

              <div className="pt-2 border-t border-slate-200 ">
                <h3 className="text-sm font-medium text-slate-800  flex items-center mb-3 mt-4">
                  <Bell className="w-4 h-4 mr-2 text-indigo-500" />
                  Preferences
                </h3>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationsEnabled}
                    onChange={(e) => setNotificationsEnabled(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-slate-700 ">Enable email notifications</span>
                </label>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  className="flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 font-medium transition-colors"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Password Section */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white  border border-slate-200  rounded-2xl shadow-sm p-6 transition-colors duration-200">
            <h2 className="text-lg font-semibold text-slate-800  flex items-center mb-6">
              <Lock className="w-5 h-5 mr-2 text-rose-500" />
              Change Password
            </h2>

            {passwordStatus.message && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${passwordStatus.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>
                {passwordStatus.message}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700  mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-slate-300  rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-white  text-slate-900 "
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700  mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-2 border border-slate-300  rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-white  text-slate-900 "
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700  mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-2 border border-slate-300  rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-white  text-slate-900 "
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full flex justify-center items-center px-4 py-2.5 bg-slate-800  text-white rounded-xl hover:bg-slate-700  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-colors font-medium"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
