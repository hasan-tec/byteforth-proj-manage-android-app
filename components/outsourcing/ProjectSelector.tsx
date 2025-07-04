import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Project } from '@/types/database';
import { responsiveFontSize } from '@/lib/responsive';

interface ProjectSelectorProps {
  selectedProjectId: string | null;
  onProjectChange: (projectId: string | null) => void;
}

export default function ProjectSelector({ selectedProjectId, onProjectChange }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <>
      <TouchableOpacity 
        style={[
          styles.selector,
          selectedProjectId ? styles.selectorActive : null
        ]} 
        onPress={() => setModalVisible(true)}
      >
        <Text style={[
          styles.selectorText,
          selectedProjectId ? styles.selectorTextActive : null
        ]}>
          {selectedProject?.name || 'All Projects'}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Project</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <TouchableOpacity 
                style={styles.projectItem}
                onPress={() => {
                  onProjectChange(null);
                  setModalVisible(false);
                }}
              >
                <Text style={styles.projectName}>All Projects</Text>
                {!selectedProjectId && (
                  <View style={styles.selectedIndicator} />
                )}
              </TouchableOpacity>
              
              {projects.map(project => (
                <TouchableOpacity
                  key={project.id}
                  style={styles.projectItem}
                  onPress={() => {
                    onProjectChange(project.id);
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.projectName}>{project.name}</Text>
                  {project.id === selectedProjectId && (
                    <View style={styles.selectedIndicator} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    backgroundColor: '#374151',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  selectorActive: {
    backgroundColor: '#3B82F6',
  },
  selectorText: {
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
  },
  selectorTextActive: {
    color: '#FFFFFF',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  modalTitle: {
    fontSize: responsiveFontSize(18),
    fontFamily: 'Inter-SemiBold',
    color: '#F9FAFB',
  },
  modalBody: {
    padding: 16,
  },
  projectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  projectName: {
    fontSize: responsiveFontSize(16),
    color: '#F9FAFB',
  },
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
});
