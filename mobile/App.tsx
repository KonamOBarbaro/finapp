import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, TouchableOpacity, StatusBar, TextInput, Alert, ActivityIndicator } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [isCheckingBiometrics, setIsCheckingBiometrics] = useState(true);

  const API_URL = 'https://aj-finapp.onrender.com/api';

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao logar');
      
      await SecureStore.setItemAsync('userToken', json.token);
      setToken(json.token);
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('userToken');
    setToken(null);
    setData(null);
  };

  useEffect(() => {
    const checkBiometricsAndToken = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync('userToken');
        if (storedToken) {
          const hasHardware = await LocalAuthentication.hasHardwareAsync();
          const isEnrolled = await LocalAuthentication.isEnrolledAsync();

          if (hasHardware && isEnrolled) {
            const result = await LocalAuthentication.authenticateAsync({
              promptMessage: 'Desbloquear AJ FinApp',
              fallbackLabel: 'Usar Senha',
            });
            if (result.success) {
              setToken(storedToken);
            }
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsCheckingBiometrics(false);
      }
    };
    checkBiometricsAndToken();
  }, []);

  useEffect(() => {
    if (token) {
      const fetchData = async () => {
        try {
          const res = await fetch(`${API_URL}/dashboard`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const json = await res.json();
          setData(json);
        } catch (err) {
          console.error(err);
        }
      };
      fetchData();
    }
  }, [token]);

  if (isCheckingBiometrics) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={{color: '#9CA3AF', textAlign: 'center', marginTop: 15, fontSize: 16}}>Protegendo seu acesso...</Text>
      </SafeAreaView>
    );
  }

  if (!token) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loginContainer}>
          <Text style={styles.appName}>AJ Solutions</Text>
          <Text style={styles.loginTitle}>Acesso Mobile</Text>
          
          <TextInput 
            style={styles.input} 
            placeholder="E-mail" 
            placeholderTextColor="#64748B"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />
          <TextInput 
            style={styles.input} 
            placeholder="Senha" 
            placeholderTextColor="#64748B"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity style={styles.btnPrimary} onPress={handleLogin} disabled={loading}>
            <Text style={styles.btnText}>{loading ? 'Entrando...' : 'Acessar'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#38BDF8" />
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>AJ</Text>
            </View>
            <View>
              <Text style={styles.greeting}>Olá, {data.workspaceName}</Text>
              <Text style={styles.appName}>AJ FinApp</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.profileBtn} onPress={handleLogout}>
            <Text style={styles.profileTxt}>Sair</Text>
          </TouchableOpacity>
        </View>

        {/* Total Balance Card */}
        <View style={styles.cardMain}>
          <Text style={styles.cardLabel}>Sobra Total (Família)</Text>
          <View style={styles.balanceContainer}>
            <Text style={styles.currency}>R$</Text>
            <Text style={styles.balance}>{(data?.finances?.leftover || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statGreen}>+ R$ {data.finances.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (Renda Total)</Text>
            <Text style={styles.statRed}>- R$ {data.finances.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (Despesas)</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Despesas Compartilhadas</Text>

        {/* Dynamic Split Status */}
        <View style={styles.splitCard}>
          <View style={styles.splitHeader}>
            <Text style={styles.splitTitle}>Divisão Inteligente Ativa</Text>
            <Text style={styles.splitSubtitle}>Calculado de acordo com a proporção familiar</Text>
          </View>
          
          {data?.splits?.map((split: any, idx: number) => (
            <View key={idx} style={styles.expenseItem}>
              <View>
                <Text style={styles.expenseName}>{split.description}</Text>
                <Text style={styles.expenseDesc}>Rateio (Múltiplas pessoas)</Text>
              </View>
              <Text style={styles.expenseValRed}>- R$ {split.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
            </View>
          ))}
          
          {(!data?.splits || data.splits.length === 0) && (
            <Text style={styles.expenseDesc}>Nenhuma despesa compartilhada neste mês.</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Cartões e Projeções</Text>
        
        {/* Credit Card Management */}
        <View style={styles.cardInfoBox}>
          <View style={styles.cardInfoHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.bankIconXP}><Text style={styles.bankInitials}>XP</Text></View>
              <View>
                <Text style={styles.cardInfoName}>XP Visa Infinite</Text>
                <Text style={styles.cardInfoVenc}>Vence dia 10</Text>
              </View>
            </View>
            <Text style={styles.cardFlag}>VISA</Text>
          </View>
          
          <View style={styles.limitContainer}>
            <View style={styles.limitRow}>
              <Text style={styles.limitLabel}>Limite Usado</Text>
              <Text style={styles.limitUsed}>R$ 5.300,00</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '88%' }]} />
            </View>
            <View style={styles.limitRow}>
              <Text style={styles.limitLabel}>Limite Disponível</Text>
              <Text style={styles.limitAvailable}>R$ 700,00 de R$ 6.000</Text>
            </View>
          </View>

          <View style={styles.divider} />
          
          {/* Projections & Analytics */}
          <Text style={styles.projectionTitle}>Projeção Inteligente</Text>
          <View style={styles.projectionItem}>
            <View style={styles.catDotLanche} />
            <Text style={styles.projectionText}>Lanches / Delivery (À Vista)</Text>
            <Text style={styles.projectionVal}>R$ 450,00</Text>
          </View>
          <View style={styles.projectionItem}>
            <View style={styles.catDotHouse} />
            <Text style={styles.projectionText}>Compras Parceladas</Text>
            <Text style={styles.projectionVal}>R$ 1.200,00</Text>
          </View>
          
          <View style={styles.projectionAlertBox}>
            <Text style={styles.projectionAlertText}>
              Baseado nos últimos meses, sugerimos reservar R$ 6.500,00 para fechar este cartão.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Conexões Open Finance</Text>
        
        <View style={styles.bankList}>
          {data?.accounts?.map((acc: any, idx: number) => (
            <TouchableOpacity key={idx} style={styles.bankItem}>
              <View style={[styles.bankIconNu, { backgroundColor: acc.isCredit ? '#1E293B' : '#1D4ED8' }]}>
                <Text style={styles.bankInitials}>{acc.bank?.substring(0, 2) || 'BN'}</Text>
              </View>
              <View style={styles.bankInfo}>
                <Text style={styles.bankName}>{acc.name}</Text>
                <Text style={styles.bankSync}>{acc.isCredit ? 'Cartão de Crédito' : 'Sincronizado'}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030811', // Deep dark navy (AJ Premium)
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 30,
  },
  loginTitle: {
    color: '#9CA3AF',
    fontSize: 18,
    marginBottom: 40,
    marginTop: 5,
  },
  input: {
    backgroundColor: '#0B1221',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    color: '#fff',
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  btnPrimary: {
    backgroundColor: '#1D4ED8',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBox: {
    width: 45,
    height: 45,
    backgroundColor: '#fff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  logoText: {
    color: '#0B2D5B',
    fontWeight: '900',
    fontSize: 20,
  },
  greeting: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  appName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileBtn: {
    paddingHorizontal: 15,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileTxt: {
    color: '#EF4444',
    fontWeight: 'bold',
    fontSize: 14,
  },
  cardMain: {
    backgroundColor: '#0B2D5B',
    borderRadius: 20,
    padding: 25,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#1D4ED8',
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currency: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 20,
    marginRight: 5,
  },
  balance: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
  },
  statsRow: {
    marginTop: 20,
  },
  statGreen: {
    color: '#10B981',
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 5,
  },
  statRed: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 14,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  splitCard: {
    backgroundColor: '#0B1221',
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  splitHeader: {
    marginBottom: 15,
  },
  splitTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  splitSubtitle: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 2,
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  expenseName: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '500',
  },
  expenseDesc: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  expenseNameBold: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  expenseValRed: {
    color: '#EF4444',
    fontWeight: 'bold',
  },
  expenseValGreen: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 15,
  },
  bankList: {
    marginBottom: 40,
  },
  bankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B1221',
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  bankIconNu: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: '#8A05BE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  bankIconIt: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: '#EC7000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  bankInitials: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  bankInfo: {
    flex: 1,
  },
  bankName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bankSync: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
  cardInfoBox: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bankIconXP: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardInfoName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardInfoVenc: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  cardFlag: {
    color: '#38BDF8',
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
  limitContainer: {
    marginBottom: 10,
  },
  limitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  limitLabel: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  limitUsed: {
    color: '#fff',
    fontWeight: 'bold',
  },
  limitAvailable: {
    color: '#10B981',
    fontWeight: 'bold',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#0F172A',
    borderRadius: 3,
    marginVertical: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#38BDF8',
    borderRadius: 3,
  },
  projectionTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  projectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  catDotLanche: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F59E0B',
    marginRight: 10,
  },
  catDotHouse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#8B5CF6',
    marginRight: 10,
  },
  projectionText: {
    color: '#CBD5E1',
    flex: 1,
    fontSize: 14,
  },
  projectionVal: {
    color: '#fff',
    fontWeight: 'bold',
  },
  projectionAlertBox: {
    marginTop: 15,
    backgroundColor: '#38BDF820',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#38BDF8',
  },
  projectionAlertText: {
    color: '#E0F2FE',
    fontSize: 13,
    lineHeight: 18,
  }
});
